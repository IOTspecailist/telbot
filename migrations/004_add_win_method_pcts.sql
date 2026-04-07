-- Win by Method 퍼센트 컬럼 추가
ALTER TABLE ufc_fighters
  ADD COLUMN IF NOT EXISTS ko_wins_pct  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dec_wins_pct INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_wins_pct INT DEFAULT 0;
