'use client'
import { useState } from 'react'
import { clients, categories, categoryMap } from '../app/clients'
import DriveGallery from './DriveGallery'
import LogoSection from './LogoSection'
import ExportTab from './ExportTab'


// Dynamic system prompt generator from client data
function buildSystemPrompt(client) {
  const colorDesc = client.colors.map((hex, i) => `${client.colorNames[i]} (${hex})`).join(', ')
  const avoidMap = {
    wolha: 'cheap, party, fun, cute, trendy, K-pop vibes',
    twohorns: 'cheap, casual, fast food vibes',
    gamisushi: 'casual, cheap, fast food',
    gakesushi: 'casual, cheap, fast food',
  }
  const locationMap = {
    queenstherapy: 'Coquitlam, Vancouver',
    joayotherapy: 'Brentwood, Burnaby',
    joayopilates: 'Brentwood, Burnaby',
    cocoricocafe: 'Robson Street, Vancouver',
    gakesushi: 'Kitsilano, Vancouver',
    gamisushi: 'Richmond, Vancouver',
  }
  const location = locationMap[client.id] || 'Vancouver, BC'
  const avoid = avoidMap[client.id] ? `\nNEVER USE: ${avoidMap[client.id]}` : ''
  return `You are a social media content creator for ${client.name} (${client.nameKo}), a ${client.category} in ${location}.

BRAND COLORS: ${colorDesc}
TONE: ${client.tone.join(', ')}
KEY SERVICES: ${client.highlights.join(', ')}
DESIGN SCHEDULE: ${client.schedule}${avoid}

Always write in the brand voice. Use the exact HEX color codes when referencing colors. Keep content relevant to the Vancouver/BC market.`
}

export default function BrandHub() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("brand");
  const [showArchived, setShowArchived] = useState(false);

  const visibleClients = clients.filter(c => showArchived ? !c.active : c.active !== false)
  const filtered = filter === "All" ? visibleClients : visibleClients.filter(c => categoryMap[filter]?.includes(c.id));
  const archivedCount = clients.filter(c => c.active === false).length;
  const copyPrompt = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const copyNotion = (client) => {
    const block = `# ${client.name} (${client.nameKo})\n📂 Category: ${client.category}\n📸 Instagram: ${client.instagram}\n🌐 Website: ${client.website}\n\n## Brand Colors\n${client.colors.map((c, i) => `- ${client.colorNames[i]}: ${c}`).join("\n")}\n\n## Tone\n${client.tone.join(" · ")}\n\n## Key Services\n${client.highlights.map(h => `- ${h}`).join("\n")}\n\n## Schedule\n${client.schedule}\n\n## ChatGPT Prompt\n${buildSystemPrompt(client)}`;
    navigator.clipboard.writeText(block); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#F7F5F2", minHeight: "100vh" }}>
      <div style={{ background: "#1a1a1a", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#C8B89A", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", marginBottom: 3 }}>Vancouver Marketing Agency</div>
          <div style={{ color: "#FFF", fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Brand Hub</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {archivedCount > 0 && (
            <button onClick={() => setShowArchived(!showArchived)}
              style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, border: "1px solid", cursor: "pointer",
                background: showArchived ? "#C0272D" : "transparent",
                color: showArchived ? "#fff" : "#888",
                borderColor: showArchived ? "#C0272D" : "#444" }}>
              {showArchived ? `📦 Archived (${archivedCount})` : `📦 ${archivedCount} archived`}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/calendar" style={{ padding: '7px 14px', background: '#C8B89A', color: '#1a1a1a', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            📅 캘린더
          </a>
          <div style={{ color: "#555", fontSize: 12 }}>{filtered.length} clients</div>
        </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 64px)" }}>
        <div style={{ width: 255, background: "#FFF", borderRight: "1px solid #E8E4DF", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "14px 14px 8px", borderBottom: "1px solid #F0EDE8" }}>
            <div style={{ fontSize: 9, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 }}>Filter</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, border: "1px solid", background: filter === cat ? "#1a1a1a" : "transparent", color: filter === cat ? "#fff" : "#666", borderColor: filter === cat ? "#1a1a1a" : "#DDD", cursor: "pointer" }}>{cat}</button>
              ))}
            </div>
          </div>
          {filtered.map(client => (
            <div key={client.id} onClick={() => { setSelected(client); setTab("brand"); }}
              style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #F5F3F0", background: selected?.id === client.id ? "#F7F5F2" : "#FFF", borderLeft: selected?.id === client.id ? "3px solid #1a1a1a" : "3px solid transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontSize: 19 }}>{client.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{client.category}</div>
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "center", flexShrink: 0 }}>
                  {client.colors.slice(0, 3).map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, border: "1px solid rgba(0,0,0,0.1)" }} />)}
                  {client.driveFolderId && <span style={{ fontSize: 8, color: "#4CAF50", marginLeft: 2 }}>●</span>}
                  {client.active === false && <span style={{ fontSize: 8, color: "#C0272D", marginLeft: 2 }}>■</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selected ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 26 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{selected.category}</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{selected.emoji} {selected.name}</h1>
                <div style={{ color: "#AAA", fontSize: 13, marginTop: 2 }}>{selected.nameKo}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => {
                  const updated = clients.map(c => c.id === selected.id ? {...c, active: !c.active} : c)
                  // Note: this is session-only — to persist, update clients.js
                  alert(selected.active === false ? `✅ ${selected.name} activated!` : `📦 ${selected.name} archived!\n\nTo make permanent, update active: false in clients.js`)
                }}
                  style={{ padding: "7px 13px", background: selected.active === false ? "#FFF0F0" : "#F0EDE8", borderRadius: 8, fontSize: 12, color: selected.active === false ? "#C0272D" : "#888", border: "none", cursor: "pointer" }}>
                  {selected.active === false ? "✅ Activate" : "📦 Archive"}
                </button>
                {selected.canvaProjectUrl && (
                  <a href={selected.canvaProjectUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "7px 13px", background: "#7B2FF7", borderRadius: 8, fontSize: 12, color: "#FFF", textDecoration: "none" }}>
                    🎨 Canva
                  </a>
                )}
                <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 13px", background: "#F0EDE8", borderRadius: 8, fontSize: 12, color: "#555", textDecoration: "none" }}>🌐 Website</a>
                <button onClick={() => copyNotion(selected)} style={{ padding: "7px 13px", background: "#1a1a1a", borderRadius: 8, fontSize: 12, color: "#fff", border: "none", cursor: "pointer" }}>{copied ? "✓ Copied!" : "📋 Copy to Notion"}</button>
              </div>
            </div>

            {selected.active === false && (
              <div style={{ padding: "10px 16px", background: "#FFF0F0", borderRadius: 10, border: "1px solid #FFCCCC", marginBottom: 16, fontSize: 12, color: "#C0272D", display: "flex", alignItems: "center", gap: 8 }}>
                📦 <strong>Archived</strong> — 이 클라이언트는 현재 비활성 상태예요. clients.js에서 active: true로 변경하면 복구돼요.
              </div>
            )}
            <div style={{ display: "flex", marginBottom: 22, borderBottom: "1px solid #E8E4DF" }}>
              {["brand", "gallery", "prompt", "schedule", "export"].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#1a1a1a" : "#999", borderBottom: tab === t ? "2px solid #1a1a1a" : "2px solid transparent", whiteSpace: "nowrap" }}>
                  {t === "brand" ? "🎨 Brand" : t === "gallery" ? `🖼️ Gallery${selected.driveFolderId ? " ●" : ""}` : t === "prompt" ? "🤖 AI Prompt" : t === "schedule" ? "📅 Schedule" : "🚀 Export"}
                </button>
              ))}
            </div>

            {tab === "brand" && (
              <div style={{ display: "grid", gap: 18 }}>
                <div style={{ background: "#FFF", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Brand Colors</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {selected.colors.map((color, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ width: 56, height: 56, borderRadius: 10, background: color, border: "1px solid rgba(0,0,0,0.08)", marginBottom: 6 }} />
                        <div style={{ fontSize: 10, color: "#888" }}>{selected.colorNames[i]}</div>
                        <div style={{ fontSize: 9, color: "#BBB", fontFamily: "monospace" }}>{color}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "#FFF", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Logo</div>
                  <LogoSection logoFolderId={selected.logoFolderId} />
                </div>
                <div style={{ background: "#FFF", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Tone of Voice</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {selected.tone.map((t, i) => <span key={i} style={{ padding: "5px 13px", background: "#F7F5F2", borderRadius: 20, fontSize: 12, color: "#444" }}>{t}</span>)}
                  </div>
                </div>
                <div style={{ background: "#FFF", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Key Services / Products</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 7 }}>
                    {selected.highlights.map((h, i) => <div key={i} style={{ padding: "7px 12px", background: "#F7F5F2", borderRadius: 8, fontSize: 12, color: "#444" }}>— {h}</div>)}
                  </div>
                </div>
                <div style={{ background: "#FFF", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Social & Web</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href={`https://instagram.com/${selected.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 14px", background: "#F7F5F2", borderRadius: 8, fontSize: 12, color: "#444", textDecoration: "none" }}>📸 {selected.instagram} ↗</a>
                    <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 14px", background: "#F7F5F2", borderRadius: 8, fontSize: 12, color: "#444", textDecoration: "none" }}>🌐 {selected.website.replace("https://", "")}</a>
                  </div>
                </div>
              </div>
            )}

            {tab === "gallery" && <DriveGallery key={selected.id} initialFolderId={selected.driveFolderId} />}

            {tab === "export" && <ExportTab client={selected} allClients={clients} />}

            {tab === "prompt" && (
              <div style={{ background: "#FFF", borderRadius: 12, padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>ChatGPT / Claude System Prompt</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Custom GPT 또는 새 대화 시작 시 붙여넣기</div>
                  </div>
                  <button onClick={() => copyPrompt(buildSystemPrompt(selected))} style={{ padding: "7px 14px", background: "#1a1a1a", borderRadius: 8, fontSize: 12, color: "#fff", border: "none", cursor: "pointer" }}>{copied ? "✓ Copied!" : "Copy Prompt"}</button>
                </div>
                <div style={{ background: "#F7F5F2", borderRadius: 8, padding: 18, fontSize: 12, lineHeight: 1.7, color: "#555", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{buildSystemPrompt(selected)}</div>
              </div>
            )}

            {tab === "schedule" && (
              <div style={{ background: "#FFF", borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Design Schedule</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                  {["Weekly Post", selected.schedule.includes("Holiday") ? "🎄 Holiday Designs" : null, selected.schedule.includes("Promo") ? "🔥 Promotions" : null].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ padding: "14px 18px", background: "#F7F5F2", borderRadius: 10, fontSize: 13, color: "#444", fontWeight: 500 }}>📅 {item}</div>
                  ))}
                </div>
                <div style={{ padding: 16, background: "#FFF8F0", borderRadius: 10, border: "1px solid #FFE8C8" }}>
                  <div style={{ fontSize: 11, color: "#CC7722", fontWeight: 600, marginBottom: 6 }}>💡 Canada Holidays to Prep</div>
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.9 }}>Canada Day (Jul 1) · BC Day (Aug 4) · Labour Day (Sep 1) · Thanksgiving (Oct 13) · Halloween (Oct 31) · Remembrance Day (Nov 11) · Christmas (Dec 25) · New Year (Jan 1) · Valentine's (Feb 14) · Mother's Day (May 11) · Father's Day (Jun 15)</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 44 }}>📂</div>
            <div style={{ fontSize: 15, color: "#999" }}>클라이언트를 선택하세요</div>
            <div style={{ fontSize: 12, color: "#CCC" }}>Select a client to view brand info</div>
          </div>
        )}
      </div>
    </div>
  );
}
