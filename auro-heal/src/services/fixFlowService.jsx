import api from "./api";

export const startFixFlow = async (payload) => {
    const res = await api.post("/fixflow/start", payload);
    return res.data;
};

export const getFixStatus = async (fixId) => {
    const res = await api.get(`/fixflow/status/${fixId}`);
    return res.data;
};

export const commitFixFlow = async (payload) => {
    const res = await api.post("/fixflow/commit", payload);
    return res.data;
};