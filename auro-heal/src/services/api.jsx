import axios from 'axios'

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_LINK}/api`,
    timeout: 600000,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_API_KEY,
    },
})

// Response Interceptor
api.interceptors.response.use(
    (response) => response,

    (error) => {
        if (error.response?.status === 401) {
            console.error('Unauthorized')
            window.location.href = '/'
        }

        if (error.response?.status === 429) {
            console.error('Too many requests')
        }

        if (!error.response) {
            console.error('Network Error')
        }

        return Promise.reject(error)
    }
)

export default api