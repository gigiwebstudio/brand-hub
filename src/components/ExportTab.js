'use client'
import { useState } from 'react'

const CANADA_HOLIDAYS = [
  { name: "Canada Day", date: "July 1", emoji: "🍁", theme: "red and white, patriotic, celebratory" },
  { name: "BC Day", date: "August 4", emoji: "🏔️", theme: "nature, BC pride, summer" },
  { name: "Labour Day", date: "September 1", emoji: "💪", theme: "end of summer, hardworking, community" },
  { name: "Thanksgiving", date: "October 13", emoji: "🍂", theme: "warm autumn tones, gratitude, family" },
  { name: "Halloween", date: "October 31", emoji: "🎃", theme: "dark, spooky, fun, orange and black" },
  { name: "Remembrance Day", date: "November 11", emoji: "🌹", theme: "respectful, red poppy, solemn" },
  { name: "Christmas", date: "December 25", emoji: "🎄", theme: "warm, festive, red and green, cozy" },
  { name: "New Year", date: "January 1", emoji: "🎆", theme: "gold, celebration, fresh start, sparkle" },
  { name: "Valentine's Day", date: "February 14", emoji: "💝", theme: "romantic, pink and red, love, warmth" },
  { name: "Mother's Day", date: "May 11", emoji: "🌸", theme: "soft florals, warmth, appreciation, pink" },
  { name: "Father's Day", date: "June 15", emoji: "👔", theme: "bold, warm, appreciation, earthy tones" },
]

function generateClientContext(client) {
  return `# CLIENT CONTEXT — ${client.name}

## Basic Info
- **Name:** ${client.name} (${client.nameKo})
- **Industry:** ${client.category}
- **Instagram:** ${client.instagram}
- **Website:** ${client.website}

## Brand Colors
${client.colors.map((c, i) => `- ${client.colorNames[i]}: ${c}`).join('\n')}

## Tone of Voice
${client.tone.join(' · ')}

## Key Services / Products
${client.highlights.map(h => `- ${h}`).join('\n')}

## Design Schedule
${client.schedule}

## AI System Prompt
${client.chatgptPrompt}

## Do's & Don'ts
**Do:**
- Always match brand colors: ${client.colors.slice(0,2).join(', ')}
- Keep tone: ${client.tone.slice(0,2).join(', ')}
- Highlight: ${client.highlights.slice(0,3).join(', ')}

**Don't:**
- Don't use off-brand colors
- Don't use generic stock imagery
- Don't use overly formal language unless it matches the tone

## Copywriting Rules
- Write in the voice of: ${client.tone.join(', ')}
- Target audience: Vancouver locals and surrounding area
- Call to action should feel natural, not pushy
- Keep captions concise, punchy, and on-brand

## Campaign Themes to Explore
- Seasonal promotions tied to Canadian holidays
- Behind-the-scenes / authentic storytelling
- Customer testimonials and social proof
- Educational content about services/products
- Limited time offers and exclusives
`
}

function generateHolidayCampaign(client, holiday) {
  return `# ${holiday.emoji} ${holiday.name} Campaign — ${client.name}

**Holiday:** ${holiday.name} (${holiday.date})
**Client:** ${client.name} | ${client.category}
**Brand Colors:** ${client.colors.slice(0,3).map((c,i) => `${client.colorNames[i]} ${c}`).join(', ')}
**Tone:** ${client.tone.join(', ')}

---

## Campaign Concept
Create a ${holiday.name} campaign for ${client.name} that feels authentic to the brand while embracing the holiday spirit (${holiday.theme}).

## Instagram Post Idea
A visual celebrating ${holiday.name} from the perspective of ${client.name}. Incorporate brand colors with holiday accents. Feature: ${client.highlights[0]}.

## Caption Angle
Connect ${holiday.name} to the brand's core message. Make it feel warm and relevant to Vancouver locals.

## Visual Direction
- **Color palette:** Blend ${client.colors[0]} with ${holiday.theme} accents
- **Mood:** ${client.tone[0]}, celebratory
- **Format:** Single hero image or 2-3 slide carousel
- **Typography:** Clean, minimal — let the visual speak

## Text Overlay Ideas
- "${holiday.emoji} Happy ${holiday.name} from ${client.name}!"
- "Celebrating ${holiday.name} with [service/product highlight]"

## ChatGPT Prompt
\`\`\`
You are creating a ${holiday.name} Instagram post for ${client.name}, a ${client.category} in Vancouver.

Brand colors: ${client.colors.slice(0,2).join(', ')}
Tone: ${client.tone.join(', ')}
Holiday vibe: ${holiday.theme}

Write:
1. A caption (under 150 words) that connects ${holiday.name} to ${client.highlights[0]}
2. 5 relevant hashtags
3. A story caption (shorter, punchier)
\`\`\`

## Claude Design Prompt
\`\`\`
Design a ${holiday.name} Instagram post for ${client.name}.
Style: ${client.tone[0]}, ${client.tone[1] || 'modern'}
Colors: Primary ${client.colors[0]}, accent with ${holiday.theme}
Include: Brand name, holiday greeting, minimal text overlay
Format: 1080x1350px (4:5 portrait)
\`\`\`
`
}

function generateBulkHolidayCampaigns(allClients, holiday) {
  return allClients.map(client =>
    generateHolidayCampaign(client, holiday)
  ).join('\n\n---\n\n')
}

export default function ExportTab({ client, allClients }) {
  const [copied, setCopied] = useState('')
  const [selectedHoliday, setSelectedHoliday] = useState(null)
  const [bulkHoliday, setBulkHoliday] = useState(null)
  const [bulkGenerated, setBulkGenerated] = useState('')
  const [activeSection, setActiveSection] = useState('context') // context | holiday | bulk

  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const downloadMd = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = { background: "#FFF", borderRadius: 12, padding: 22, marginBottom: 16 }
  const labelStyle = { fontSize: 10, color: "#999", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }
  const btnPrimary = { padding: "9px 18px", background: "#1a1a1a", color: "#fff", borderRadius: 8, fontSize: 12, border: "none", cursor: "pointer" }
  const btnSecondary = { padding: "9px 18px", background: "#F0EDE8", color: "#555", borderRadius: 8, fontSize: 12, border: "none", cursor: "pointer" }

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: 'context', label: '📋 Client Context' },
          { key: 'holiday', label: '🎄 Holiday Campaign' },
          { key: 'bulk', label: '⚡ Bulk Generator' },
        ].map(sec => (
          <button key={sec.key} onClick={() => setActiveSection(sec.key)}
            style={{ padding: "8px 16px", borderRadius: 20, fontSize: 12, border: "1px solid", cursor: "pointer",
              background: activeSection === sec.key ? "#1a1a1a" : "#FFF",
              color: activeSection === sec.key ? "#FFF" : "#666",
              borderColor: activeSection === sec.key ? "#1a1a1a" : "#DDD" }}>
            {sec.label}
          </button>
        ))}
      </div>

      {/* ── SECTION 1: Client Context ── */}
      {activeSection === 'context' && (
        <div>
          <div style={s}>
            <div style={labelStyle}>Full AI Context — {client.name}</div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 1.6 }}>
              ChatGPT나 Claude에 붙여넣으면 브랜드 설명 없이 바로 작업 가능한 전체 컨텍스트예요.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => copy(generateClientContext(client), 'context')} style={btnPrimary}>
                {copied === 'context' ? '✓ Copied!' : '📋 Copy Full Context'}
              </button>
              <button onClick={() => downloadMd(generateClientContext(client), `${client.id}_context.md`)} style={btnSecondary}>
                ⬇️ Download .md
              </button>
            </div>
            <div style={{ background: "#F7F5F2", borderRadius: 8, padding: 18, fontSize: 11, lineHeight: 1.8, color: "#555", fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
              {generateClientContext(client)}
            </div>
          </div>

          <div style={s}>
            <div style={labelStyle}>Quick Prompt Copy</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Instagram Post", prompt: `Create an Instagram post for ${client.name}. ${client.chatgptPrompt}` },
                { label: "Story", prompt: `Create an Instagram Story for ${client.name}. Keep it short and punchy. ${client.chatgptPrompt}` },
                { label: "Carousel (5 slides)", prompt: `Create a 5-slide educational Instagram carousel for ${client.name}. ${client.chatgptPrompt}` },
                { label: "Caption + Hashtags", prompt: `Write a caption and 10 hashtags for ${client.name}'s latest Instagram post. ${client.chatgptPrompt}` },
              ].map((item, i) => (
                <button key={i} onClick={() => copy(item.prompt, `quick_${i}`)}
                  style={{ ...btnSecondary, fontSize: 11 }}>
                  {copied === `quick_${i}` ? '✓ Copied!' : item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: Holiday Campaign ── */}
      {activeSection === 'holiday' && (
        <div>
          <div style={s}>
            <div style={labelStyle}>Holiday 선택 — {client.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 20 }}>
              {CANADA_HOLIDAYS.map(h => (
                <button key={h.name} onClick={() => setSelectedHoliday(h)}
                  style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid", cursor: "pointer", textAlign: "left",
                    background: selectedHoliday?.name === h.name ? "#1a1a1a" : "#FFF",
                    color: selectedHoliday?.name === h.name ? "#FFF" : "#333",
                    borderColor: selectedHoliday?.name === h.name ? "#1a1a1a" : "#EEE" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{h.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{h.date}</div>
                </button>
              ))}
            </div>

            {selectedHoliday && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button onClick={() => copy(generateHolidayCampaign(client, selectedHoliday), 'holiday')} style={btnPrimary}>
                    {copied === 'holiday' ? '✓ Copied!' : `📋 Copy ${selectedHoliday.name} Campaign`}
                  </button>
                  <button onClick={() => downloadMd(generateHolidayCampaign(client, selectedHoliday), `${client.id}_${selectedHoliday.name.replace(/ /g,'_')}.md`)} style={btnSecondary}>
                    ⬇️ Download .md
                  </button>
                </div>
                <div style={{ background: "#F7F5F2", borderRadius: 8, padding: 18, fontSize: 11, lineHeight: 1.8, color: "#555", fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>
                  {generateHolidayCampaign(client, selectedHoliday)}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 3: Bulk Generator ── */}
      {activeSection === 'bulk' && (
        <div>
          <div style={s}>
            <div style={labelStyle}>⚡ Bulk Holiday Campaign Generator</div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 1.6 }}>
              Holiday 하나 선택하면 — 전체 클라이언트 {allClients.length}개의 캠페인을 한번에 생성해요.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 20 }}>
              {CANADA_HOLIDAYS.map(h => (
                <button key={h.name} onClick={() => { setBulkHoliday(h); setBulkGenerated(generateBulkHolidayCampaigns(allClients, h)) }}
                  style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid", cursor: "pointer", textAlign: "left",
                    background: bulkHoliday?.name === h.name ? "#1a1a1a" : "#FFF",
                    color: bulkHoliday?.name === h.name ? "#FFF" : "#333",
                    borderColor: bulkHoliday?.name === h.name ? "#1a1a1a" : "#EEE" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{h.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{h.date}</div>
                </button>
              ))}
            </div>

            {bulkGenerated && bulkHoliday && (
              <>
                <div style={{ padding: "12px 16px", background: "#F0FFF4", borderRadius: 10, border: "1px solid #A8E6BA", marginBottom: 16, fontSize: 12, color: "#2D6A4F" }}>
                  ✅ {allClients.length}개 클라이언트 × {bulkHoliday.name} 캠페인 생성 완료
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <button onClick={() => copy(bulkGenerated, 'bulk')} style={btnPrimary}>
                    {copied === 'bulk' ? '✓ Copied!' : '📋 전체 복사'}
                  </button>
                  <button onClick={() => downloadMd(bulkGenerated, `ALL_CLIENTS_${bulkHoliday.name.replace(/ /g,'_')}_campaigns.md`)} style={btnSecondary}>
                    ⬇️ Download All (.md)
                  </button>
                </div>

                {/* Per-client quick copy */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {allClients.map(c => (
                    <button key={c.id} onClick={() => copy(generateHolidayCampaign(c, bulkHoliday), `bulk_${c.id}`)}
                      style={{ padding: "10px 14px", background: "#FFF", borderRadius: 8, border: "1px solid #EEE", fontSize: 11, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{c.emoji}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#333" }}>{c.name}</span>
                      <span style={{ color: copied === `bulk_${c.id}` ? "#4CAF50" : "#BBB", fontSize: 10 }}>
                        {copied === `bulk_${c.id}` ? "✓" : "copy"}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
