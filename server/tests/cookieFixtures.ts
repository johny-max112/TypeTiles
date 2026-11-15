export const socketOptions = (token?: string) => ({ headers: { Origin: "http://localhost:5173", ...(token ? { Cookie: `typetiles_session=${token}` } : {}) } });
