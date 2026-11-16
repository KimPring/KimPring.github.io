export const routes = Object.freeze({
  home: '홈', pitcher: '투수 분석', batter: '타자 분석', cards: '선수 카드',
  leaderboard: '리더보드', team: '팀 분석', compare: '선수 비교', highlights: '하이라이트',
  awards: '어워드', matchup: '매치업 시뮬레이션', h2h: '상대전적', rv: 'Run Value',
  xout: '기대성적·운', league: '리그전', insights: '시즌 인사이트', myteam: '내 팀 빌더',
  records: '기록실', pfpmanager: '프로필 관리', pitchtype: '구종 분석', defense: '팀 수비',
  ballmap: '타구 분석', defender: '수비수 분석', scouting: '상대 공략',
  scoutreport: '선수 평가', scoutlab: '팀 공략', gamereport: '경기 후 리포트'
});
export function pageFile(page) {
  if (!Object.hasOwn(routes, page)) throw new Error(`Unknown page: ${page}`);
  return page === 'home' ? 'index.html' : `${page}.html`;
}
export function pageURL(page, base = import.meta.url) {
  return new URL(`../../${pageFile(page)}`, base);
}
