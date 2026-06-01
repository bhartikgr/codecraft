// core/builder/buildScriptResolver.js

'use strict'

const path = require('path')
const os = require('os')
const fs = require('fs')

function getBuildScript(stack) {

    const isWindows =
        os.platform() === 'win32'

    const baseDir = path.join(
        process.cwd(),
        'scripts',
        'release',
        'check-build'
    )

    const scripts = {

        dotnet: isWindows
            ? 'csharp-build.bat'
            : 'csharp-build-docker-image.sh',

        node: isWindows
            ? 'node-build.bat'
            : 'node-build.sh',

        maven: isWindows
            ? 'java-build.bat'
            : 'java-build.sh'

    }

    const file = scripts[stack.framework]

    if (!file) {
        throw new Error(
            `Unsupported stack: ${stack.framework}`
        )
    }

    const fullPath = path.join(
        baseDir,
        file
    )

    if (!fs.existsSync(fullPath)) {

        throw new Error(
            `Build script missing: ${fullPath}`
        )

    }

    return fullPath
}

module.exports = {
    getBuildScript
}