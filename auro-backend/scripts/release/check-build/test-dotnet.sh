#!/bin/bash
set -e
PROJECT_PATH=$(pwd)

cleanup() {
  echo "Cleaning build artifacts..."
  rm -f Directory.Build.props 2>/dev/null || true
  rm -rf bin obj 2>/dev/null || true
  find . -type d -name bin -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name obj -exec rm -rf {} + 2>/dev/null || true
}
trap cleanup EXIT

# Write Directory.Build.props on the HOST before docker run.
# Host $(pwd) is mounted as /app inside the container.
# MSBuild auto-discovers Directory.Build.props walking up from test/*.Tests.csproj.
# Coverlet reads ExcludeByFile + ExcludeByAttribute from these MSBuild properties.
# No semicolon quoting issues because this is plain bash heredoc, not inside bash -c.
cat > Directory.Build.props << 'PROPS'
<Project>
  <PropertyGroup>
    <ExcludeByFile>**/Program.cs;**/*Dto.cs;**/*DTO.cs;**/*Request.cs;**/*Response.cs;**/*Options.cs;**/*Config.cs;**/*Token.cs;**/*.designer.cs;**/*.generated.cs;**/*.g.cs;**/Reference.cs;**/Migrations/**</ExcludeByFile>
    <ExcludeByAttribute>ExcludeFromCodeCoverage</ExcludeByAttribute>
  </PropertyGroup>
</Project>
PROPS

docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e DOTNET_CLI_HOME=/tmp/.dotnet \
  -e HOME=/tmp \
  -e DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
  -e DOTNET_CLI_TELEMETRY_OPTOUT=1 \
  -v "$(pwd)":/app \
  -w /app \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  bash -c "
    mkdir -p /tmp/.dotnet
    echo 'Running tests with coverage...'
    set +e
    mkdir -p test/coverage
    dotnet test test/*.Tests.csproj \
      --verbosity minimal \
      /p:CollectCoverage=true \
      /p:CoverletOutputFormat=cobertura \
      /p:CoverletOutput=./test/coverage/
    TEST_EXIT_CODE=\$?
    set -e
    echo '===== COVERAGE FILE DIAGNOSTICS ====='
    echo '--- test/coverage/ directory listing ---'
    ls -la test/coverage/ 2>/dev/null || echo 'test/coverage/ directory does not exist or is empty'
    echo '--- searching all .xml files under test/ ---'
    find test/ -name '*.xml' 2>/dev/null || echo 'No .xml files found under test/'
    echo '--- searching all .cobertura.xml files anywhere ---'
    find . -name '*.cobertura.xml' 2>/dev/null || echo 'No .cobertura.xml files found'
    echo '--- coverage file content (first 30 lines) ---'
    COVERAGE_FILE=\$(find test/ -name '*.cobertura.xml' 2>/dev/null | head -1)
    if [ -n \"\$COVERAGE_FILE\" ]; then
      echo \"Found: \$COVERAGE_FILE\"
      head -30 \"\$COVERAGE_FILE\"
    else
      echo 'No cobertura.xml found to display'
    fi
    echo '===== END DIAGNOSTICS ====='
    echo 'Generating coverage summary...'
    dotnet tool install --tool-path /tmp/tools dotnet-reportgenerator-globaltool >/dev/null 2>&1 || true
    COVERAGE_FILE=\$(find test/ -name '*.cobertura.xml' 2>/dev/null | head -1)
    if [ -n \"\$COVERAGE_FILE\" ]; then
      echo \"Using coverage file: \$COVERAGE_FILE\"
      /tmp/tools/reportgenerator \
        -reports:\"\$COVERAGE_FILE\" \
        -targetdir:./test/coverage-report \
        -reporttypes:TextSummary \
        || echo 'Coverage generation failed (ignored)'
    else
      echo 'Coverage generation skipped — no cobertura.xml found'
    fi
    echo '===== COVERAGE SUMMARY ====='
    cat ./test/coverage-report/Summary.txt 2>/dev/null || echo 'No coverage summary available'
    exit \$TEST_EXIT_CODE
  "