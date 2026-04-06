-- 표적 별 중요 타격 컬럼 제거
-- kr.ufc.com의 해당 데이터는 JS 렌더링으로만 제공되어 서버사이드 fetch 불가

ALTER TABLE ufc_fighters
  DROP COLUMN IF EXISTS tgt_head_count,
  DROP COLUMN IF EXISTS tgt_head_pct,
  DROP COLUMN IF EXISTS tgt_body_count,
  DROP COLUMN IF EXISTS tgt_body_pct,
  DROP COLUMN IF EXISTS tgt_leg_count,
  DROP COLUMN IF EXISTS tgt_leg_pct;
