export default async () => {
    await fetch(`${process.env.URL}/healthz`).catch(() => { });
};
export const config = { schedule: "* * * * *" };