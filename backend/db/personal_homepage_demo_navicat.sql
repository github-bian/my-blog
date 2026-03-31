CREATE DATABASE IF NOT EXISTS personal_homepage
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE personal_homepage;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT NOT NULL AUTO_INCREMENT,
  author_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_posts_author_id (author_id),
  CONSTRAINT fk_posts_author_id_users
    FOREIGN KEY (author_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @likes_col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'likes_count'
);

SET @likes_col_sql = IF(
  @likes_col_exists = 0,
  'ALTER TABLE posts ADD COLUMN likes_count INT NOT NULL DEFAULT 0 AFTER content',
  'SELECT 1'
);

PREPARE likes_stmt FROM @likes_col_sql;
EXECUTE likes_stmt;
DEALLOCATE PREPARE likes_stmt;

INSERT INTO users (email, password_hash, display_name, created_at)
VALUES (
  'demo@example.com',
  'pbkdf2:sha256:1000000$V2lIXYUJ95835Twb$1e37166db08658b2d27947f845a43d6fbb9f89b2e94b9d88e29aecac5d208315',
  '演示用户',
  UTC_TIMESTAMP(6)
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  display_name = VALUES(display_name);

SET @demo_user_id = (SELECT id FROM users WHERE email = 'demo@example.com' LIMIT 1);

DELETE FROM posts
WHERE author_id = @demo_user_id
  AND title IN (
    '第一篇：本地项目跑通记录',
    '第二篇：无登录点赞功能说明',
    '第三篇：仪表盘统计已上线'
  );

INSERT INTO posts (author_id, title, content, likes_count, created_at, updated_at)
VALUES
  (
    @demo_user_id,
    '第一篇：本地项目跑通记录',
    '今天把 Flask API、Nest 代理、React 前端全部联调成功，登录后可以直接发帖。',
    12,
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6)
  ),
  (
    @demo_user_id,
    '第二篇：无登录点赞功能说明',
    '内容卡片新增公开点赞接口，访客无需登录即可点赞，前端会实时回显点赞数。',
    7,
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6)
  ),
  (
    @demo_user_id,
    '第三篇：仪表盘统计已上线',
    '新增仪表盘区域，展示设备类型、CPU 使用率、内存占用等关键运行指标。',
    3,
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6)
  );
