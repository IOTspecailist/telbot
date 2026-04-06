-- UFC 한국 홈페이지 원본 스탯 저장 테이블
-- /api/fighter 조회 시 upsert

CREATE TABLE IF NOT EXISTS ufc_fighters (
  slug              TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  weight_class      TEXT,

  -- 전적
  total_wins        INT,
  total_losses      INT,
  ko_wins           INT,
  sub_wins          INT,
  dec_wins          INT,
  ko_losses         INT,
  sub_losses        INT,
  dec_losses        INT,

  -- 핵심 스탯
  strike_per_min    NUMERIC,
  allowed_per_min   NUMERIC,
  striking_accuracy NUMERIC,
  striking_defense  NUMERIC,
  takedown_accuracy NUMERIC,
  takedown_defense  NUMERIC,
  td_per_15         NUMERIC,
  subs_per_15       NUMERIC,
  avg_fight_min     NUMERIC,
  kd_avg            NUMERIC,

  -- 포지션 별 중요 타격
  pos_standing_count  INT,
  pos_standing_pct    INT,
  pos_clinch_count    INT,
  pos_clinch_pct      INT,
  pos_ground_count    INT,
  pos_ground_pct      INT,

  -- 표적 별 중요 타격
  tgt_head_count    INT,
  tgt_head_pct      INT,
  tgt_body_count    INT,
  tgt_body_pct      INT,
  tgt_leg_count     INT,
  tgt_leg_pct       INT,

  fetched_at        TIMESTAMPTZ DEFAULT NOW()
);
