-- fighter-score.ts 능력치 항목 개편에 따른 DB 컬럼명 변경
-- score_striking  → score_strikingoffense
-- score_speed     → score_strikingdefense
-- score_chin      → score_wrestlingoffense
-- score_wrestling → score_wrestlingdefense

ALTER TABLE mma_cards
  RENAME COLUMN score_striking  TO score_strikingoffense;

ALTER TABLE mma_cards
  RENAME COLUMN score_speed     TO score_strikingdefense;

ALTER TABLE mma_cards
  RENAME COLUMN score_chin      TO score_wrestlingoffense;

ALTER TABLE mma_cards
  RENAME COLUMN score_wrestling TO score_wrestlingdefense;
