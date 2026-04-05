export interface RawStats {
  strikePerMin: number
  allowedPerMin: number
  striking_accuracy: number
  striking_defense: number
  takedown_accuracy: number
  takedown_defense: number
  td_per_15: number
  subs_per_15: number
  avg_fight_min: number
  kd_avg: number
  ko_wins: number
  sub_wins: number
  dec_wins: number
  total_wins: number
  ko_losses: number
  sub_losses: number
  dec_losses: number
  total_losses: number
}

export interface Scores {
  power: number
  strikingOffense: number
  strikingDefense: number
  wrestlingOffense: number
  wrestlingDefense: number
  jiujitsu: number
  cardio: number
  fightiq: number
}

function normalize(value: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

function toScore(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n * 9 + 1)))
}

export function calcScores(s: RawStats): Scores {
  const totalFights = s.total_wins + s.total_losses

  // Power: KO효율(kd_avg/SLpM) × KO승률 + 타격정확도
  // 기준: Holloway=4 (raw 0.3283), Chandler=7 (raw 0.5646)
  const koRate = s.total_wins > 0 ? s.ko_wins / s.total_wins : 0
  const slpmNorm = normalize(s.strikePerMin, 1.5, 7.0)
  const kdEff = s.kd_avg > 0
    ? Math.min(s.kd_avg / Math.max(slpmNorm, 0.01), 0.8)
    : 0.5  // kd_avg 미제공 시 중립값
  const powerRaw = koRate * kdEff + s.striking_accuracy * 0.364
  const powerMapped = (powerRaw - 0.3283) / (0.5646 - 0.3283) * 3 + 4
  const power = Math.min(10, Math.max(1, Math.round(powerMapped)))

  // 타격성공: 타격정확도 × 0.6 + strikePerMin정규화 × 0.4
  const strikingOffense =
    s.striking_accuracy * 0.6 +
    normalize(s.strikePerMin, 1.5, 7.0) * 0.4

  // 타격방어: striking_defense 그대로 변환
  const strikingDefense = s.striking_defense

  // 레슬링성공: takedown_accuracy × 0.5 + normalize(td_per_15, 0, 6) × 0.5
  const wrestlingOffense =
    s.takedown_accuracy * 0.5 +
    normalize(s.td_per_15, 0, 6) * 0.5

  // 레슬링방어: takedown_defense 그대로 변환
  const wrestlingDefense = s.takedown_defense

  // 서브미션: 서브미션 승률 + 15분당 서브미션
  const jiujitsu = s.total_wins > 0
    ? (s.sub_wins / s.total_wins) * 0.6 +
      normalize(s.subs_per_15, 0, 1.5) * 0.4
    : 0

  // Cardio: max(타격 지속력, 그래플링 지속력)
  const strikingVol = normalize(s.avg_fight_min * s.strikePerMin, 5, 100)
  const grapplingVol = normalize(s.avg_fight_min * (s.td_per_15 / 15), 0, 8)
  const cardio = Math.max(strikingVol, grapplingVol)

  // Fight IQ: 9개 스탯 기반 + 경험 가중치, 선형 매핑
  // base = (승률×2 + SLpM + StrAcc + StrDef + TDAcc + TDavg + TDDef + Subavg − SApM) / 9
  const winRate = totalFights > 0 ? s.total_wins / totalFights : 0
  const fiqBase = (
    winRate * 2 +
    normalize(s.strikePerMin, 1.5, 7.0) +
    s.striking_accuracy +
    s.striking_defense +
    s.takedown_accuracy +
    normalize(s.td_per_15, 0, 6) +
    s.takedown_defense +
    normalize(s.subs_per_15, 0, 1.5) -
    normalize(s.allowedPerMin, 1.5, 7.0)
  ) / 9
  // 경험 가중치: winRate ≥ 85%, 10/15/20/25/30승 티어당 +0.025
  const fiqBonus = winRate >= 0.85
    ? [10, 15, 20, 25, 30].filter(t => s.total_wins >= t).length * 0.025
    : 0
  // 선형 매핑: Jones 29-0 → 10 (anchor 0.7279), Chandler 23-10 → 3 (anchor 0.4407)
  const fiqMapped = (fiqBase + fiqBonus - 0.4407) / (0.7279 - 0.4407) * 7 + 3
  const fightiq = Math.min(10, Math.max(1, Math.round(fiqMapped)))

  return {
    power:           power,
    strikingOffense: toScore(strikingOffense),
    strikingDefense: toScore(strikingDefense),
    wrestlingOffense: toScore(wrestlingOffense),
    wrestlingDefense: toScore(wrestlingDefense),
    jiujitsu:        toScore(jiujitsu),
    cardio:          toScore(cardio),
    fightiq,
  }
}
