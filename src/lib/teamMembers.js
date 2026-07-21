// Who a task can be assigned to. Edit this list when the team changes —
// no other code needs to change.
export const TEAM_MEMBERS = ['슬기', '경민', '상원', '대표님'];

// A color per person, used for badges/chips throughout the board. Add a new
// name here too when adding someone to TEAM_MEMBERS above. Falls back to a
// neutral grey for anyone not listed.
export const TEAM_MEMBER_COLORS = {
  슬기: '#8FA8C8',
  경민: '#C97B63',
  상원: '#B7C9A8',
  대표님: '#D8B26A',
};

export function getTeamMemberColor(name) {
  return TEAM_MEMBER_COLORS[name] || '#B0B0B0';
}
