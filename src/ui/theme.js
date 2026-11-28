// Shared design tokens and inline styles for the app.


// Elevation scale: tight ambient-occlusion shadow + softer ambient shadow, consistent downward light.
export const shadowSm = "0 1px 2px rgba(16,24,40,.04), 0 2px 8px rgba(16,24,40,.05)";
export const shadowMd = "0 2px 4px rgba(16,24,40,.05), 0 10px 24px rgba(16,24,40,.09)";
export const shadowLg = "0 -2px 8px rgba(16,24,40,.04), 0 -16px 48px rgba(16,24,40,.18)";
export const shadowPrimary = "0 2px 6px rgba(26,115,232,.28), 0 8px 20px rgba(26,115,232,.22)";
export const shadowCard = "0 8px 24px rgba(16,24,40,.14), 0 24px 60px rgba(16,24,40,.20)";
export const BORDER = "#eaeef3";

export const cardStyle = { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: "1px solid " + BORDER, boxShadow: shadowSm, overflow: "hidden" };
export const inputStyle = { background: "#f7f9fc", border: "1px solid #e3e8ef", borderRadius: 10, color: "#1a2332", padding: "10px 4px", fontSize: 16, fontWeight: 600, textAlign: "center", outline: "none", width: "100%", minWidth: 0, minHeight: 44 };
export const fieldStyle = { background: "#f7f9fc", border: "1px solid #e3e8ef", borderRadius: 12, color: "#1a2332", padding: "14px 16px", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box" };
export const labelStyle = { fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 12, letterSpacing: ".02em", textTransform: "uppercase" };
export const colStyle = { fontSize: 11, fontWeight: 500, color: "#9ca3af", textAlign: "center" };
export const navBtnStyle = { background: "#fff", border: "1px solid " + BORDER, borderRadius: 12, width: 40, height: 40, fontSize: 20, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadowSm };
export const closeBtn = { background: "none", border: "none", color: "#d1d5db", fontSize: 20, padding: 8, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" };
export const overlay = { position: "fixed", inset: 0, background: "rgba(16,24,40,.42)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
export const sheet = { background: "#fff", borderRadius: 22, padding: "20px", width: "100%", maxWidth: 480, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: shadowCard, animation: "popIn .2s cubic-bezier(.22,1,.36,1)" };
export const sheetHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
export const xBtn = { background: "#f3f4f6", border: "none", borderRadius: 50, width: 36, height: 36, fontSize: 18, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" };
export const primaryBtn = { width: "100%", background: "linear-gradient(180deg,#2b7cf0,#1a73e8)", color: "#fff", border: "none", borderRadius: 14, padding: "18px", fontSize: 16, fontWeight: 700, minHeight: 56, boxShadow: shadowPrimary };