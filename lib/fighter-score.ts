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

  // Power: KO승률 + kd_avg 기반 티어 계산
  const koRate = s.total_wins > 0 ? s.ko_wins / s.total_wins : 0
  const hasKo  = s.total_wins > 0
  const kd     = s.kd_avg
  const hasKd  = kd > 0

  // 각 지표를 1-9 점수로 변환
  const koScore = (r: number): number => {
    if (r >= 0.8)  return 9
    if (r >= 0.4)  return 5 + Math.round((r - 0.4) / (0.8 - 0.4) * 3)  // 5~8
    if (r >  0.2)  return 3 + Math.round((r - 0.2) / (0.4 - 0.2))       // 3~4
    return 2
  }
  const kdScore = (k: number): number => {
    if (k >= 1.2)  return 9
    if (k >= 0.35) return 5 + Math.round((k - 0.35) / (1.2 - 0.35) * 3) // 5~8
    if (k >  0.2)  return 3 + Math.round((k - 0.2)  / (0.35 - 0.2))     // 3~4
    return 2
  }

  // 1차: 둘 중 높은 점수 기준
  let power: number
  if (hasKo && hasKd)       power = Math.max(koScore(koRate), kdScore(kd))
  else if (hasKo)            power = koScore(koRate)
  else if (hasKd)            power = kdScore(kd)
  else                       power = 5

  // 10점: 9점 달성 + 나머지 지표가 기준값의 65% 이상
  if (power === 9) {
    if (hasKo && koRate >= 0.8 && hasKd && kd  >= koRate * 0.65) power = 10
    else if (hasKd && kd >= 1.2 && hasKo && koRate >= kd * 0.65) power = 10
  }

  // 1점: 2점 달성 + 나머지 지표가 기준값의 65% 이하
  if (power === 2) {
    if (hasKo && koRate <= 0.2 && hasKd && kd  <= koRate * 0.65) power = 1
    else if (hasKd && kd <= 0.2 && hasKo && koRate <= kd * 0.65) power = 1
  }

  power = Math.min(10, Math.max(1, power))

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

  // Fight IQ: 방어 핵심 2개 + 허용타격 + 경기운영 기반 티어 점수표
  const fiqSd  = (() => {
    const v = s.striking_defense
    if (v >= 0.64) return 10; if (v >= 0.60) return 9; if (v >= 0.57) return 8
    if (v >= 0.54) return 7;  if (v >= 0.51) return 6; if (v >= 0.48) return 5
    if (v >= 0.45) return 4;  if (v >= 0.42) return 3; if (v >= 0.39) return 2
    return 1
  })()
  const fiqTd  = (() => {
    const v = s.takedown_defense
    if (v >= 0.93) return 10; if (v >= 0.88) return 9; if (v >= 0.83) return 8
    if (v >= 0.78) return 7;  if (v >= 0.73) return 6; if (v >= 0.68) return 5
    if (v >= 0.63) return 4;  if (v >= 0.58) return 3; if (v >= 0.53) return 2
    return 1
  })()
  const fiqApm = (() => {
    const v = s.allowedPerMin
    if (v <= 2.00) return 10; if (v <= 2.50) return 9; if (v <= 3.00) return 8
    if (v <= 3.50) return 7;  if (v <= 4.00) return 6; if (v <= 4.50) return 5
    if (v <= 5.00) return 4;  if (v <= 5.50) return 3; if (v <= 6.50) return 2
    return 1
  })()
  const fiqAfm = (() => {
    const v = s.avg_fight_min
    if (v >= 15.0) return 10; if (v >= 14.0) return 9; if (v >= 13.0) return 8
    if (v >= 12.0) return 7;  if (v >= 11.0) return 6; if (v >= 10.0) return 5
    if (v >= 9.0)  return 4;  if (v >= 8.0)  return 3; if (v >= 7.0)  return 2
    return 1
  })()

  const fiqBase = fiqSd * 0.30 + fiqTd * 0.35 + fiqApm * 0.20 + fiqAfm * 0.15

  // 상위권 보너스
  let fiqElite = 0
  if (fiqSd >= 9 || fiqTd >= 9) {
    const otherOk = (fiqSd >= 9 && fiqTd >= 9) ? true : fiqSd >= 9 ? fiqTd >= 8 : fiqSd >= 8
    if (otherOk && (fiqApm >= 8 || fiqAfm >= 8)) fiqElite = 1
  }

  // 하위권 감점
  let fiqPenalty = 0
  if ((fiqSd <= 2 || fiqTd <= 2) && fiqSd <= 2 && fiqTd <= 2 && fiqApm <= 2) fiqPenalty = 1

  // 반올림: 0.5 이상 올림, 0.5 미만 내림
  const fightiq = Math.min(10, Math.max(1, Math.floor(fiqBase + fiqElite - fiqPenalty + 0.5)))

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
