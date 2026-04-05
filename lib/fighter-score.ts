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

  // Power
  // 엘리트(ko승률 ≥80% 또는 kd_avg ≥1.5): base 9
  // 그 외: ko승률 raw 스케일(ceiling 없음) → koScore가 4 이하이면서 kd_avg ≥0.25이면 +1 보정
  // 보너스 +1(최대 10점): 타격정확도 ≥60% + (ko≥80% and kd≥0.75) or (kd≥1.5 and ko≥75%)
  const koRate = s.total_wins > 0 ? s.ko_wins / s.total_wins : 0
  let powerBase: number
  if (koRate >= 0.80 || s.kd_avg >= 1.5) {
    powerBase = 9
  } else {
    const koScore = Math.min(8, Math.max(1, Math.round(koRate * 8 + 1)))
    powerBase = (koScore <= 4 && s.kd_avg >= 0.25) ? Math.min(8, koScore + 1) : koScore
  }
  const powerBonus = (
    s.striking_accuracy >= 0.60 && (
      (koRate >= 0.80 && s.kd_avg >= 0.75) ||
      (s.kd_avg >= 1.5 && koRate >= 0.75)
    )
  ) ? 1 : 0
  const power = Math.min(10, powerBase + powerBonus)

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

  // Fight IQ: 승률 + 나쁘게 안 지는 것 + 방어 지능
  const winRate = totalFights > 0 ? s.total_wins / totalFights : 0
  const finishLossRate = s.total_losses > 0
    ? (s.ko_losses + s.sub_losses) / s.total_losses
    : 0
  const fightiq =
    winRate * 0.4 +
    (1 - finishLossRate) * 0.3 +
    s.striking_defense * 0.3

  return {
    power:           power,
    strikingOffense: toScore(strikingOffense),
    strikingDefense: toScore(strikingDefense),
    wrestlingOffense: toScore(wrestlingOffense),
    wrestlingDefense: toScore(wrestlingDefense),
    jiujitsu:        toScore(jiujitsu),
    cardio:          toScore(cardio),
    fightiq:         toScore(fightiq),
  }
}
