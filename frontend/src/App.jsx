import { useEffect, useMemo, useState } from "react";
import {
  getToken,
  setToken as saveToken,
  clearToken,
  login,
  register,
  listMonitors,
  createMonitor,
  deleteMonitor,
  upgradeToPro,
  getMe, // ✅ NUEVO
} from "./api";

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function StatusPill({ status }) {
  const isUp = status === "up";
  const isDown = status === "down";
  const bg = isUp ? "#123a1b" : isDown ? "#3a1212" : "#2b2b2b";
  const border = isUp ? "#2bd44a" : isDown ? "#ff4d4d" : "#777";
  const text = isUp ? "UP" : isDown ? "DOWN" : "UNKNOWN";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        fontSize: 12,
        letterSpacing: 0.5,
      }}
    >
      {text}
    </span>
  );
}

function PlanBadge({ plan }) {
  const p = (plan || "FREE").toUpperCase();
  const isPro = p === "PRO";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${isPro ? "#2bd44a" : "#777"}`,
        background: isPro ? "#123a1b" : "#2b2b2b",
        fontSize: 12,
        letterSpacing: 0.4,
      }}
    >
      Plan: <b>{p}</b>
    </span>
  );
}

export default function App() {
  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);

  // Data
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create monitor form
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  // Auto refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshEvery, setRefreshEvery] = useState(3);

  // Upgrade CTA
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  const headersToken = useMemo(() => token, [token]);

  function handleLogout() {
    clearToken();
    setTokenState(null);
    setUser(null);
    setMonitors([]);
    setShowUpgrade(false);
    setUpgradeMsg("");
  }

  async function refreshMonitors() {
    if (!headersToken) return;
    setLoading(true);
    try {
      const data = await listMonitors(headersToken);
      setMonitors(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = String(e.message || "").toLowerCase();
      // token inválido/expirado => logout
      if (msg.includes("expired") || msg.includes("missing") || msg.includes("authorization")) {
        handleLogout();
        return;
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Cuando hay token: traer /api/me y luego monitores (así el plan se “recupera” en refresh)
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const me = await getMe(token);
        setUser(me || null);
      } catch (e) {
        // si falla, probablemente token inválido
        handleLogout();
        return;
      }
      await refreshMonitors();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto refresh monitores
  useEffect(() => {
    if (!token || !autoRefresh) return;
    const ms = Math.max(1, Number(refreshEvery || 3)) * 1000;
    const id = setInterval(refreshMonitors, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, autoRefresh, refreshEvery]);

  async function handleAuth(isRegister) {
    try {
      const res = isRegister
        ? await register(email, password)
        : await login(email, password);

      const t = (res.access_token || "").trim();
      saveToken(t);
      setTokenState(t);

      // si viene user lo usamos, si no luego lo trae /api/me
      setUser(res.user || null);

      setShowUpgrade(false);
      setUpgradeMsg("");
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleCreate() {
    try {
      await createMonitor(token, {
        name,
        url,
        interval_seconds: Number(intervalSeconds || 60),
      });
      setName("");
      setUrl("");
      await refreshMonitors();
    } catch (e) {
      const msg = String(e.message || "");
      if (msg.toLowerCase().includes("límite") || msg.toLowerCase().includes("limite")) {
        setUpgradeMsg(msg);
        setShowUpgrade(true);
        return;
      }
      alert(msg);
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar este monitor?")) return;
    try {
      await deleteMonitor(token, id);
      await refreshMonitors();
    } catch (e) {
      alert(e.message);
    }
  }

  // --------- Plan UI helpers ----------
  const plan = (user?.plan || "FREE").toUpperCase();
  const isPro = plan === "PRO";
  const used = monitors.length;
  const freeLimit = 3;
  const remaining = Math.max(0, freeLimit - used);

  // ✅ Upgrade conectado y luego sincroniza /api/me
  async function handleUpgradeClick() {
    try {
      await upgradeToPro(token);

      const me = await getMe(token);
      setUser(me || { ...(user || {}), plan: "PRO" });

      setShowUpgrade(false);
      setUpgradeMsg("");
      alert("Listo: ahora sos PRO ✅");
    } catch (e) {
      alert(e.message || "No se pudo hacer upgrade");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>PingTrace</h1>

      {!token ? (
        <>
          <h2>Login / Register</h2>
          <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
            <input
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleAuth(false)}>Login</button>
              <button onClick={() => handleAuth(true)}>Register</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={handleLogout}>Logout</button>

            <button onClick={refreshMonitors} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <label style={{ marginLeft: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto refresh
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              cada
              <input
                type="number"
                min="1"
                style={{ width: 70 }}
                value={refreshEvery}
                onChange={(e) => setRefreshEvery(e.target.value)}
              />
              s
            </label>

            <div style={{ marginLeft: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <PlanBadge plan={plan} />
              {!isPro && (
                <span style={{ fontSize: 12, color: "#bbb" }}>
                  {used}/{freeLimit} usados · te quedan {remaining}
                </span>
              )}
              {!isPro && (
                <button onClick={handleUpgradeClick} style={{ marginLeft: 6 }}>
                  Upgrade a PRO
                </button>
              )}
            </div>
          </div>

          {showUpgrade && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #ff4d4d",
                borderRadius: 10,
                background: "#2b1515",
                maxWidth: 720,
              }}
            >
              <b style={{ color: "#ffb3b3" }}>Plan FREE alcanzó el límite</b>
              <div style={{ marginTop: 6, color: "#ddd" }}>
                {upgradeMsg || "Límite del plan FREE alcanzado (máx 3)."}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button onClick={handleUpgradeClick}>Upgrade a PRO</button>
                <button onClick={() => setShowUpgrade(false)}>Cerrar</button>
              </div>
            </div>
          )}

          <h2 style={{ marginTop: 24 }}>Create Monitor</h2>
          <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <input
              placeholder="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="url (https://...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              interval_seconds
              <input
                type="number"
                min="5"
                style={{ width: 120 }}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(e.target.value)}
              />
            </label>
            <button onClick={handleCreate}>Create</button>
          </div>

          <h2 style={{ marginTop: 24 }}>Monitors</h2>
          {monitors.length === 0 ? (
            <p>No hay monitores todavía.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={th}>Status</th>
                    <th style={th}>Name</th>
                    <th style={th}>URL</th>
                    <th style={th}>Code</th>
                    <th style={th}>Latency</th>
                    <th style={th}>Last checked</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((m) => (
                    <tr key={m.id}>
                      <td style={td}><StatusPill status={m.last_status} /></td>
                      <td style={td}>{m.name}</td>
                      <td style={td}>
                        <a href={m.url} target="_blank" rel="noreferrer">{m.url}</a>
                      </td>
                      <td style={td}>{m.last_code ?? "—"}</td>
                      <td style={td}>
                        {m.last_latency_ms != null ? `${m.last_latency_ms} ms` : "—"}
                      </td>
                      <td style={td}>{fmtDate(m.last_checked_at)}</td>
                      <td style={td}>
                        <button onClick={() => handleDelete(m.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const th = {
  textAlign: "left",
  borderBottom: "1px solid #444",
  padding: "10px 8px",
  fontWeight: 600,
};

const td = {
  borderBottom: "1px solid #333",
  padding: "10px 8px",
  verticalAlign: "top",
};
