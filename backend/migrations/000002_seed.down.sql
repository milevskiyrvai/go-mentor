-- Rollback seed data (ТЗ §26).
-- Deletes only rows seeded in 000002_seed.up.sql so a fresh `migrate up` keeps the schema intact.

DELETE FROM notifications
 WHERE user_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM activity_events
 WHERE user_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM calendar_events
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'))
    OR buddy_id   IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM one_on_one_requests
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM discount_conversions
 WHERE user_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM bonus_transactions
 WHERE user_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM user_achievements
 WHERE user_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM achievements;

DELETE FROM interviews
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM final_checks
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM block_progress
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM material_progress
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM roadmap_materials;
DELETE FROM roadmap_blocks;

DELETE FROM student_buddy_assignments
 WHERE student_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'))
    OR buddy_id   IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM user_roles
 WHERE user_id IN (SELECT id FROM users WHERE login IN ('admin','buddy','student1','student2','student3','multi'));

DELETE FROM users
 WHERE login IN ('admin','buddy','student1','student2','student3','multi');
