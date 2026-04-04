export interface RawStats {
  spm: number
  sapm: number
  striking_accuracy: number
  striking_defense: number
  takedown_accuracy: number
  takedown_defense: number
  td_per_15: number
  subs_per_15: number
  avg_fight_min: number
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
  striking: number
  speed: number
  chin: number
  wrestling: number
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

  // Power: KO 피니시 비율
  const power = s.total_wins > 0
    ? s.ko_wins / s.total_wins
    : 0

  // Striking: 정확도(기술) + 분당 타격(출력)
  const striking =
    s.striking_accuracy * 0.6 +
    normalize(s.spm, 1.5, 7.0) * 0.4

  // Speed: 분당 유효 타격수
  const speed = normalize(s.spm, 1.5, 7.0)

  // Chin: 흡수 타격 적을수록 + 방어율 높을수록
  const chin =
    (1 - normalize(s.sapm, 1.0, 6.0)) * 0.5 +
    s.striking_defense * 0.5

  // Wrestling: 테이크다운 성공률 + 방어율
  const wrestling =
    s.takedown_accuracy * 0.5 +
    s.takedown_defense * 0.5

  // Jiu-Jitsu: 서브미션 승률 + 15분당 서브미션
  const jiujitsu = s.total_wins > 0
    ? (s.sub_wins / s.total_wins) * 0.6 +
      normalize(s.subs_per_15, 0, 1.5) * 0.4
    : 0

  // Cardio: max(타격 지속력, 그래플링 지속력)
  const strikingVol = normalize(s.avg_fight_min * s.spm, 5, 100)
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
    power:     toScore(power),
    striking:  toScore(striking),
    speed:     toScore(speed),
    chin:      toScore(chin),
    wrestling: toScore(wrestling),
    jiujitsu:  toScore(jiujitsu),
    cardio:    toScore(cardio),
    fightiq:   toScore(fightiq),
  }
}
