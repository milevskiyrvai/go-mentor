-- Seed data for Go Mentor (ТЗ §26).
-- Применяется автоматически при старте backend (см. backend/internal/db/db.go).
-- Источник: ТЗ §14 (ачивки), §23 (модель), §26 (demo-данные).
--
-- bcrypt-хеши паролей сгенерированы заранее (cost=10):
--   admin    / Admin123!
--   buddy    / Buddy123!
--   student1 / Student123!
--   student2 / Student123!
--   student3 / Student123!
--   multi    / Multi123!

BEGIN;

-- =========================================================================
-- 1. USERS
-- =========================================================================

INSERT INTO users (id, login, password_hash, display_name, avatar_url, about, telegram_username, learning_started_at, is_profile_private, created_at, updated_at)
VALUES
    -- Admin
    ('a0000000-0000-4000-8000-000000000001'::uuid,
     'admin',
     '$2b$10$gU4wnv7hhRczXzf9tzQ9jei2de1jHqQDeCegMXx8EMqW./VUbmcNC',
     'Анна Админова',
     'https://api.dicebear.com/9.x/personas/svg?seed=anna_admin&backgroundColor=ffdb3d,d4ff3d&backgroundType=gradientLinear',
     'Администратор платформы Go Mentor. Управляет roadmap, ачивками и Buddy-составом.',
     'gomentor_demo_admin',
     NULL,
     FALSE,
     NOW() - INTERVAL '60 days',
     NOW() - INTERVAL '60 days'),

    -- Buddy
    ('b0000000-0000-4000-8000-000000000001'::uuid,
     'buddy',
     '$2b$10$LGZWb60SfOBSrZoXfdGYI.ubIiUrYBzGlNL2bxZoml94eb05kwwSi',
     'Иван Менторов',
     'https://api.dicebear.com/9.x/personas/svg?seed=ivan_buddy&backgroundColor=ff3d9a,d4ff3d&backgroundType=gradientLinear',
     'Senior Go-разработчик. 6 лет в продакшене, делаю код-ревью и провожу mock-собеседования.',
     'gomentor_demo_buddy',
     NOW() - INTERVAL '90 days',
     FALSE,
     NOW() - INTERVAL '90 days',
     NOW() - INTERVAL '90 days'),

    -- Multi-role: Student + Buddy (основной demo-юзер)
    ('c0000000-0000-4000-8000-000000000001'::uuid,
     'multi',
     '$2b$10$gijODUaKUtOlZuGtDXK.meJngYZDwMalOSfIi.4GOcIBbmTCK625a',
     'Михаил Кротов',
     'https://api.dicebear.com/9.x/personas/svg?seed=mikhail_multi&backgroundColor=d4ff3d,ff3d9a&backgroundType=gradientLinear',
     'Backend-разработчик, переходящий в Go из Python. Параллельно менторю двух джунов.',
     'gomentor_demo_multi',
     NOW() - INTERVAL '19 days',
     FALSE,
     NOW() - INTERVAL '19 days',
     NOW() - INTERVAL '1 hours'),

    -- Student 1
    ('d0000000-0000-4000-8000-000000000001'::uuid,
     'student1',
     '$2b$10$QiP7TleeE8AJvQp4ek5OYu6zAFYIxCeA2iCExglEufJYtPI7bKIfG',
     'Дарья Смирнова',
     'https://api.dicebear.com/9.x/personas/svg?seed=daria_student&backgroundColor=ff3d9a,7be38c&backgroundType=gradientLinear',
     'Junior Go-developer, готовлюсь к финалу.',
     'gomentor_demo_student1',
     NOW() - INTERVAL '34 days',
     FALSE,
     NOW() - INTERVAL '34 days',
     NOW() - INTERVAL '2 hours'),

    -- Student 2
    ('d0000000-0000-4000-8000-000000000002'::uuid,
     'student2',
     '$2b$10$QiP7TleeE8AJvQp4ek5OYu6zAFYIxCeA2iCExglEufJYtPI7bKIfG',
     'Андрей Носов',
     'https://api.dicebear.com/9.x/personas/svg?seed=andrey_student&backgroundColor=7be38c,d4ff3d&backgroundType=gradientLinear',
     NULL,
     'gomentor_demo_student2',
     NOW() - INTERVAL '40 days',
     FALSE,
     NOW() - INTERVAL '40 days',
     NOW() - INTERVAL '12 days'),

    -- Student 3
    ('d0000000-0000-4000-8000-000000000003'::uuid,
     'student3',
     '$2b$10$QiP7TleeE8AJvQp4ek5OYu6zAFYIxCeA2iCExglEufJYtPI7bKIfG',
     'Екатерина Лебедева',
     'https://api.dicebear.com/9.x/personas/svg?seed=kate_student&backgroundColor=d4ff3d,7be38c&backgroundType=gradientLinear',
     'Только начала путь в Go.',
     'gomentor_demo_student3',
     NOW() - INTERVAL '5 days',
     FALSE,
     NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '6 hours');

-- =========================================================================
-- 2. ROLES
-- =========================================================================

INSERT INTO user_roles (user_id, role) VALUES
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin'),
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'buddy'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'student'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'buddy'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'student'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'student'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'student');

-- =========================================================================
-- 3. BUDDY ASSIGNMENTS
-- Иван Менторов (buddy) — наставник для всех трёх student-ов и для multi-юзера.
-- =========================================================================

INSERT INTO student_buddy_assignments (student_id, buddy_id, created_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, NOW() - INTERVAL '19 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, NOW() - INTERVAL '34 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, NOW() - INTERVAL '40 days'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, NOW() - INTERVAL '5 days');

-- =========================================================================
-- 4. ROADMAP BLOCKS (5 шт.)
-- =========================================================================

INSERT INTO roadmap_blocks (id, title, description, sort_order, is_active, created_at, updated_at) VALUES
    ('11111111-1111-4111-8111-000000000001'::uuid,
     'Foundations',
     'Синтаксис Go, базовые типы, структуры, указатели. Закрепляем основу.',
     1, TRUE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    ('11111111-1111-4111-8111-000000000002'::uuid,
     'Interfaces & Errors',
     'Дизайн интерфейсов, embedding, error wrapping, errors.Is/As, кастомные ошибки.',
     2, TRUE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    ('11111111-1111-4111-8111-000000000003'::uuid,
     'Concurrency',
     'Горутины, каналы, select, sync-примитивы, context, race detector.',
     3, TRUE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    ('11111111-1111-4111-8111-000000000004'::uuid,
     'Tests & Benchmarks',
     'Table-driven тесты, покрытие, бенчмарки, pprof, профайлинг.',
     4, TRUE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    ('11111111-1111-4111-8111-000000000005'::uuid,
     'Production Go',
     'Деплой, observability, graceful shutdown, конфигурация, секьюрити.',
     5, TRUE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days');

-- =========================================================================
-- 5. ROADMAP MATERIALS
-- В каждом блоке: 3-5 theory, 3-5 questions, 2-4 practice, 1 homework.
-- Минимум один материал каждого типа — is_required=TRUE.
-- =========================================================================

-- ---- Блок 01: Foundations ------------------------------------------------
INSERT INTO roadmap_materials
    (id, block_id, title, description, type, content_type, url, content,
     preview_title, preview_description, preview_image, source, is_required, sort_order)
VALUES
    ('22222222-0001-4001-8001-000000000101'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'A Tour of Go', 'Официальный интерактивный тур по языку.',
     'theory', 'url', 'https://go.dev/tour/',
     NULL,
     'A Tour of Go', 'Интерактивная прогулка по синтаксису, начиная с Hello World.',
     'https://go.dev/images/gophers/ladder.svg', 'go.dev', TRUE, 1),

    ('22222222-0001-4001-8001-000000000102'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Effective Go', 'Канонические идиомы и стиль кода.',
     'theory', 'article', 'https://go.dev/doc/effective_go',
     NULL,
     'Effective Go', 'Гид по идиоматичному стилю от команды Go.',
     NULL, 'go.dev', TRUE, 2),

    ('22222222-0001-4001-8001-000000000103'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Go by Example', 'Сборник коротких примеров по всем темам.',
     'theory', 'url', 'https://gobyexample.com/',
     NULL,
     'Go by Example', 'Короткие сниппеты-примеры для повторения синтаксиса.',
     NULL, 'gobyexample.com', FALSE, 3),

    ('22222222-0001-4001-8001-000000000104'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Go Memory Model: указатели и адресация', 'Видео-разбор про указатели и стек/куча.',
     'theory', 'youtube', 'https://www.youtube.com/watch?v=Zwjf64m5bRk',
     NULL,
     'Pointers in Go', 'Глубокий разбор адресов, эскейп-анализа и расположения значений.',
     NULL, 'youtube.com', FALSE, 4),

    ('22222222-0001-4001-8001-000000000105'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Объясни в одну минуту: что такое zero value', 'Тренировка устного ответа.',
     'questions', 'text', NULL,
     'Сформулируй за 60 секунд: что такое zero value, какие zero value у map, slice, channel, struct?',
     NULL, NULL, NULL, NULL, TRUE, 5),

    ('22222222-0001-4001-8001-000000000106'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Чем отличается array от slice?', NULL,
     'questions', 'text', NULL,
     'Опиши внутреннее устройство slice (ptr/len/cap) и поведение при append.',
     NULL, NULL, NULL, NULL, TRUE, 6),

    ('22222222-0001-4001-8001-000000000107'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Map в Go: что под капотом?', NULL,
     'questions', 'text', NULL,
     'Bucket-структура, расширение map, причины non-deterministic итерации.',
     NULL, NULL, NULL, NULL, FALSE, 7),

    ('22222222-0001-4001-8001-000000000108'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Реши задачу: FizzBuzz на Go', 'Прогрев на синтаксис.',
     'practice', 'text', NULL,
     'Напиши классический FizzBuzz: 3 — Fizz, 5 — Buzz, 15 — FizzBuzz. Без if/else внутри switch — попробуй на map.',
     NULL, NULL, NULL, NULL, TRUE, 8),

    ('22222222-0001-4001-8001-000000000109'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Реализуй стек на slice', NULL,
     'practice', 'github', 'https://github.com/golang/go/wiki/SliceTricks',
     NULL,
     'Slice Tricks', 'Канонические приёмы работы со слайсами.',
     NULL, 'github.com', FALSE, 9),

    ('22222222-0001-4001-8001-000000000110'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'Домашнее задание: CLI-калькулятор', 'Сдай Buddy.',
     'homework', 'text', NULL,
     'Напиши CLI-калькулятор: парсит выражения вида "2 + 3 * 4", поддерживает +, -, *, /. Покрой 5 тестами. Сдай через PR в свой fork.',
     NULL, NULL, NULL, NULL, TRUE, 10);

-- ---- Блок 02: Interfaces & Errors ----------------------------------------
INSERT INTO roadmap_materials
    (id, block_id, title, description, type, content_type, url, content,
     preview_title, preview_description, preview_image, source, is_required, sort_order)
VALUES
    ('22222222-0002-4002-8002-000000000201'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Go Interfaces — официальный блог',
     'Дизайн маленьких интерфейсов: io.Reader, io.Writer.',
     'theory', 'article', 'https://go.dev/blog/laws-of-reflection',
     NULL,
     'The Laws of Reflection', 'Интерфейсы изнутри: type/value пара, reflect.',
     NULL, 'go.dev/blog', TRUE, 1),

    ('22222222-0002-4002-8002-000000000202'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Working with Errors in Go 1.13', 'Error wrapping, errors.Is/As.',
     'theory', 'article', 'https://go.dev/blog/go1.13-errors',
     NULL,
     'Working with Errors in Go 1.13', 'errors.Is, errors.As, fmt.Errorf("%w").',
     NULL, 'go.dev/blog', TRUE, 2),

    ('22222222-0002-4002-8002-000000000203'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Don''t Panic', 'Когда уместен panic, а когда — нет.',
     'theory', 'article', 'https://go.dev/doc/effective_go#panic',
     NULL,
     'Effective Go: panic', 'Когда вообще можно паниковать.',
     NULL, 'go.dev', FALSE, 3),

    ('22222222-0002-4002-8002-000000000204'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Чем отличается nil interface от nil pointer внутри interface?', NULL,
     'questions', 'text', NULL,
     'Объясни, почему `var p *T; var i I = p; i != nil`.',
     NULL, NULL, NULL, NULL, TRUE, 4),

    ('22222222-0002-4002-8002-000000000205'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Когда писать свой error type vs sentinel error?', NULL,
     'questions', 'text', NULL,
     'Sentinel: io.EOF. Custom struct: когда нужны поля. Wrapped: когда нужен контекст.',
     NULL, NULL, NULL, NULL, TRUE, 5),

    ('22222222-0002-4002-8002-000000000206'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Что такое interface satisfaction в Go?', NULL,
     'questions', 'text', NULL,
     'Структурное соответствие vs nominal. Нет ключевого слова implements.',
     NULL, NULL, NULL, NULL, FALSE, 6),

    ('22222222-0002-4002-8002-000000000207'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Реализуй io.Reader-обёртку с лимитом', 'Аналог io.LimitReader, но с собственной обработкой.',
     'practice', 'github', 'https://github.com/golang/go/blob/master/src/io/io.go',
     NULL, 'io package source', 'Посмотри как io.LimitReader устроен внутри.',
     NULL, 'github.com', TRUE, 7),

    ('22222222-0002-4002-8002-000000000208'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Напиши кастомный error с полями', NULL,
     'practice', 'text', NULL,
     'Реализуй NotFoundError{Resource string, ID string} с Error() и Unwrap(). Покрой тестами с errors.As.',
     NULL, NULL, NULL, NULL, FALSE, 8),

    ('22222222-0002-4002-8002-000000000209'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'Домашнее задание: типобезопасный logger', 'Сдай Buddy.',
     'homework', 'text', NULL,
     'Спроектируй интерфейс Logger с уровнями Debug/Info/Warn/Error и контекстными полями. Реализуй stdout-имплементацию. Сдай PR.',
     NULL, NULL, NULL, NULL, TRUE, 9);

-- ---- Блок 03: Concurrency ------------------------------------------------
INSERT INTO roadmap_materials
    (id, block_id, title, description, type, content_type, url, content,
     preview_title, preview_description, preview_image, source, is_required, sort_order)
VALUES
    -- Theory: 5
    ('22222222-0003-4003-8003-000000000301'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Concurrency is not Parallelism — Rob Pike', 'Классическое выступление автора Go.',
     'theory', 'youtube', 'https://www.youtube.com/watch?v=oV9rvDllKEg',
     NULL, 'Concurrency is not Parallelism',
     'Rob Pike объясняет разницу на примерах с gophers.',
     NULL, 'youtube.com', TRUE, 1),

    ('22222222-0003-4003-8003-000000000302'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Go Memory Model', 'Официальный документ по happens-before.',
     'theory', 'article', 'https://go.dev/ref/mem',
     NULL, 'The Go Memory Model',
     'Гарантии видимости значений между горутинами.',
     NULL, 'go.dev', TRUE, 2),

    ('22222222-0003-4003-8003-000000000303'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Go Concurrency Patterns: Pipelines and cancellation', 'Канонический blog-post.',
     'theory', 'article', 'https://go.dev/blog/pipelines',
     NULL, 'Pipelines and cancellation',
     'Channels, fan-out/fan-in, корректная остановка.',
     NULL, 'go.dev/blog', TRUE, 3),

    ('22222222-0003-4003-8003-000000000304'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Context Package — официальный гайд', NULL,
     'theory', 'article', 'https://go.dev/blog/context',
     NULL, 'Go Concurrency: Context',
     'Зачем нужен context, когда отменять.',
     NULL, 'go.dev/blog', TRUE, 4),

    ('22222222-0003-4003-8003-000000000305'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'sync.Mutex vs channels — когда что использовать', NULL,
     'theory', 'article', 'https://go.dev/wiki/MutexOrChannel',
     NULL, 'MutexOrChannel',
     'Don''t communicate by sharing memory; share memory by communicating.',
     NULL, 'go.dev/wiki', TRUE, 5),

    -- Questions: 5
    ('22222222-0003-4003-8003-000000000306'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Что произойдёт при чтении из закрытого канала?', NULL,
     'questions', 'text', NULL,
     'Чтение возвращает zero value немедленно, второе значение из comma-ok — false.',
     NULL, NULL, NULL, NULL, TRUE, 6),

    ('22222222-0003-4003-8003-000000000307'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Чем отличается buffered от unbuffered channel?', NULL,
     'questions', 'text', NULL,
     'Unbuffered = синхронизация (rendezvous). Buffered: send блокируется при полном буфере, recv — при пустом.',
     NULL, NULL, NULL, NULL, TRUE, 7),

    ('22222222-0003-4003-8003-000000000308'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Что такое goroutine leak и как его поймать?', NULL,
     'questions', 'text', NULL,
     'Зависшие goroutines, ожидающие на channel/lock. Поиск: goleak, pprof goroutine profile.',
     NULL, NULL, NULL, NULL, TRUE, 8),

    ('22222222-0003-4003-8003-000000000309'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'select без default — что произойдёт, если все case заблокированы?', NULL,
     'questions', 'text', NULL,
     'Горутина блокируется до тех пор, пока хотя бы один case не станет готов.',
     NULL, NULL, NULL, NULL, TRUE, 9),

    ('22222222-0003-4003-8003-000000000310'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Зачем нужен context.WithTimeout vs WithDeadline?', NULL,
     'questions', 'text', NULL,
     'WithTimeout удобнее для относительного срока, WithDeadline — для абсолютного.',
     NULL, NULL, NULL, NULL, TRUE, 10),

    -- Practice: 4
    ('22222222-0003-4003-8003-000000000311'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Реализуй worker pool на каналах', 'N воркеров, обрабатывающих задачи из общего канала.',
     'practice', 'text', NULL,
     'Worker pool с graceful shutdown через context. Покрой race detector.',
     NULL, NULL, NULL, NULL, TRUE, 11),

    ('22222222-0003-4003-8003-000000000312'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Реализуй fan-out / fan-in', NULL,
     'practice', 'text', NULL,
     'Разветви поток на N горутин-обработчиков, потом собери результаты обратно в один канал.',
     NULL, NULL, NULL, NULL, TRUE, 12),

    ('22222222-0003-4003-8003-000000000313'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Race condition challenge', 'Найди и почини гонку.',
     'practice', 'github', 'https://github.com/golang/go/wiki/LearnConcurrency',
     NULL, 'Learn Concurrency',
     'Подборка задач от команды Go.',
     NULL, 'github.com', FALSE, 13),

    ('22222222-0003-4003-8003-000000000314'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Rate limiter на time.Ticker', NULL,
     'practice', 'text', NULL,
     'Реализуй rate limiter: не более N запросов в секунду. Сравни с golang.org/x/time/rate.',
     NULL, NULL, NULL, NULL, FALSE, 14),

    -- Homework
    ('22222222-0003-4003-8003-000000000315'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'Домашнее задание: concurrent web crawler', 'Финальная задача блока.',
     'homework', 'text', NULL,
     'Напиши конкурентный краулер, который обходит сайт глубиной 2, не повторяя URL. Поддерживает отмену через context. Сдай PR.',
     NULL, NULL, NULL, NULL, TRUE, 15);

-- ---- Блок 04: Tests & Benchmarks -----------------------------------------
INSERT INTO roadmap_materials
    (id, block_id, title, description, type, content_type, url, content,
     preview_title, preview_description, preview_image, source, is_required, sort_order)
VALUES
    ('22222222-0004-4004-8004-000000000401'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Testing — официальная документация', 'Пакет testing полностью.',
     'theory', 'article', 'https://pkg.go.dev/testing',
     NULL, 'testing package',
     'TestingT, B, M, table-driven, helpers.',
     NULL, 'pkg.go.dev', TRUE, 1),

    ('22222222-0004-4004-8004-000000000402'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Profiling Go Programs', 'pprof, flame graph.',
     'theory', 'article', 'https://go.dev/blog/pprof',
     NULL, 'Profiling Go Programs',
     'CPU/heap/goroutine профили, flame graphs.',
     NULL, 'go.dev/blog', TRUE, 2),

    ('22222222-0004-4004-8004-000000000403'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Table-Driven Tests', NULL,
     'theory', 'article', 'https://go.dev/wiki/TableDrivenTests',
     NULL, 'Table-Driven Tests', 'Канонический подход к тестам в Go.',
     NULL, 'go.dev/wiki', FALSE, 3),

    ('22222222-0004-4004-8004-000000000404'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Чем benchmark отличается от теста?', NULL,
     'questions', 'text', NULL,
     'Сигнатура BenchmarkXxx(b *testing.B), цикл по b.N, измеряет ns/op, B/op, allocs/op.',
     NULL, NULL, NULL, NULL, TRUE, 4),

    ('22222222-0004-4004-8004-000000000405'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Что такое subtests и зачем они нужны?', NULL,
     'questions', 'text', NULL,
     't.Run, изоляция, параллельность, читаемые отчёты.',
     NULL, NULL, NULL, NULL, TRUE, 5),

    ('22222222-0004-4004-8004-000000000406'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'go test -race — что делает?', NULL,
     'questions', 'text', NULL,
     'Включает data-race detector. Замедляет тесты в ~2-20 раз, ловит конкурентные доступы.',
     NULL, NULL, NULL, NULL, FALSE, 6),

    ('22222222-0004-4004-8004-000000000407'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Покрой свой crawler из блока 3 тестами', NULL,
     'practice', 'text', NULL,
     'Цель: 80% покрытия. Используй httptest.NewServer для мока сети.',
     NULL, NULL, NULL, NULL, TRUE, 7),

    ('22222222-0004-4004-8004-000000000408'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Прогон бенчмарков на string concat', NULL,
     'practice', 'text', NULL,
     'Сравни +=, strings.Builder, bytes.Buffer, fmt.Sprintf. Зафиксируй allocs.',
     NULL, NULL, NULL, NULL, FALSE, 8),

    ('22222222-0004-4004-8004-000000000409'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'Домашка: HTTP-сервис + интеграционные тесты', 'Сдай Buddy.',
     'homework', 'text', NULL,
     'Подними CRUD-сервис на chi с двумя ручками. Покрой интеграционными тестами через httptest. Сдай PR.',
     NULL, NULL, NULL, NULL, TRUE, 9);

-- ---- Блок 05: Production Go ----------------------------------------------
INSERT INTO roadmap_materials
    (id, block_id, title, description, type, content_type, url, content,
     preview_title, preview_description, preview_image, source, is_required, sort_order)
VALUES
    ('22222222-0005-4005-8005-000000000501'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Go @ Production — практические советы', NULL,
     'theory', 'article', 'https://peter.bourgon.org/go-for-industrial-programming/',
     NULL, 'Go for Industrial Programming',
     'Конфигурация, структура проекта, миграции, observability.',
     NULL, 'bourgon.org', TRUE, 1),

    ('22222222-0005-4005-8005-000000000502'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Graceful shutdown в HTTP-сервере', NULL,
     'theory', 'article', 'https://go.dev/blog/context',
     NULL, 'Graceful shutdown',
     'Signal handling, context cancellation, http.Server.Shutdown.',
     NULL, 'go.dev/blog', TRUE, 2),

    ('22222222-0005-4005-8005-000000000503'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Структурированное логирование (slog)', NULL,
     'theory', 'article', 'https://pkg.go.dev/log/slog',
     NULL, 'log/slog', 'Официальный structured logger в стандартной библиотеке Go 1.21+.',
     NULL, 'pkg.go.dev', FALSE, 3),

    ('22222222-0005-4005-8005-000000000504'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Что такое 12-factor app и как применить к Go?', NULL,
     'questions', 'text', NULL,
     'Конфиг через env, stateless процессы, логи как stream, dev/prod parity.',
     NULL, NULL, NULL, NULL, TRUE, 4),

    ('22222222-0005-4005-8005-000000000505'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Как организовать graceful shutdown HTTP-сервиса?', NULL,
     'questions', 'text', NULL,
     'signal.NotifyContext → server.Shutdown(ctx) → дождаться завершения in-flight запросов.',
     NULL, NULL, NULL, NULL, TRUE, 5),

    ('22222222-0005-4005-8005-000000000506'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Что такое Prometheus exposition format?', NULL,
     'questions', 'text', NULL,
     'Текстовый формат метрик /metrics. Counter, Gauge, Histogram, Summary.',
     NULL, NULL, NULL, NULL, FALSE, 6),

    ('22222222-0005-4005-8005-000000000507'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Запакуй приложение в Docker (multi-stage)', NULL,
     'practice', 'github', 'https://github.com/docker/docs/blob/main/content/language/golang/build-images.md',
     NULL, 'Docker Go build', 'Multi-stage Dockerfile с минимальным финальным образом.',
     NULL, 'github.com', TRUE, 7),

    ('22222222-0005-4005-8005-000000000508'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Добавь /metrics с Prometheus client', NULL,
     'practice', 'text', NULL,
     'Подключи prometheus/client_golang, экспортируй request_duration_seconds histogram.',
     NULL, NULL, NULL, NULL, FALSE, 8),

    ('22222222-0005-4005-8005-000000000509'::uuid, '11111111-1111-4111-8111-000000000005'::uuid,
     'Финальная домашка: задеплой свой сервис', 'Сдай Buddy.',
     'homework', 'text', NULL,
     'Подними сервис в docker-compose с PostgreSQL и Prometheus. README с инструкциями. Сдай PR.',
     NULL, NULL, NULL, NULL, TRUE, 9);

-- =========================================================================
-- 6. ACHIEVEMENTS (РОВНО 14, ТЗ §14)
-- =========================================================================

INSERT INTO achievements (id, title, description, reward_bonus, condition_type, condition_params, sort_order)
VALUES
    ('33333333-0000-4000-8000-000000000001'::uuid,
     'Первый шаг', 'Посмотри первый материал в roadmap.',
     10, 'materials_viewed_count', '{"count":1}'::jsonb, 1),

    ('33333333-0000-4000-8000-000000000002'::uuid,
     'Разогрев', 'Посмотри 10 материалов.',
     25, 'materials_viewed_count', '{"count":10}'::jsonb, 2),

    ('33333333-0000-4000-8000-000000000003'::uuid,
     'Фокус', 'Посмотри 25 материалов.',
     50, 'materials_viewed_count', '{"count":25}'::jsonb, 3),

    ('33333333-0000-4000-8000-000000000004'::uuid,
     'Блок 1 закрыт', 'Buddy подтвердил блок 1.',
     40, 'block_approved', '{"block_index":1}'::jsonb, 4),

    ('33333333-0000-4000-8000-000000000005'::uuid,
     'Блок 2 закрыт', 'Buddy подтвердил блок 2.',
     50, 'block_approved', '{"block_index":2}'::jsonb, 5),

    ('33333333-0000-4000-8000-000000000006'::uuid,
     'Блок 3 закрыт', 'Buddy подтвердил блок 3.',
     60, 'block_approved', '{"block_index":3}'::jsonb, 6),

    ('33333333-0000-4000-8000-000000000007'::uuid,
     'Блок 4 закрыт', 'Buddy подтвердил блок 4.',
     70, 'block_approved', '{"block_index":4}'::jsonb, 7),

    ('33333333-0000-4000-8000-000000000008'::uuid,
     'Блок 5 закрыт', 'Buddy подтвердил блок 5.',
     90, 'block_approved', '{"block_index":5}'::jsonb, 8),

    ('33333333-0000-4000-8000-000000000009'::uuid,
     'Первый mock', 'Прошёл первое mock-собеседование.',
     30, 'interviews_count', '{"type":"mock","count":1}'::jsonb, 9),

    ('33333333-0000-4000-8000-000000000010'::uuid,
     'Первый real', 'Прошёл первое real-собеседование.',
     50, 'interviews_count', '{"type":"real","count":1}'::jsonb, 10),

    ('33333333-0000-4000-8000-000000000011'::uuid,
     'Серия real ×3', 'Прошёл три real-собеседования.',
     120, 'interviews_count', '{"type":"real","count":3}'::jsonb, 11),

    ('33333333-0000-4000-8000-000000000012'::uuid,
     'Профиль оформлен', 'Аватар + поле «О себе».',
     20, 'profile_completed', '{}'::jsonb, 12),

    ('33333333-0000-4000-8000-000000000013'::uuid,
     'Финалист', 'Сдан Technical и Roast.',
     300, 'finals_completed', '{}'::jsonb, 13),

    ('33333333-0000-4000-8000-000000000014'::uuid,
     '1×1 игрок', 'Первая одобренная 1×1.',
     0, 'first_one_on_one_approved', '{}'::jsonb, 14);

-- =========================================================================
-- 7. MATERIAL PROGRESS — Михаил Кротов (multi)
-- Блок 01 (10 материалов): все просмотрены
-- Блок 02 (9 материалов): все просмотрены
-- Блок 03 (15 материалов): 9 просмотрены (5 theory + 4 questions) ≈ 60%
-- =========================================================================

-- Блок 01 — все 10 материалов
INSERT INTO material_progress (student_id, material_id, viewed_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000101'::uuid, NOW() - INTERVAL '18 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000102'::uuid, NOW() - INTERVAL '18 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000103'::uuid, NOW() - INTERVAL '17 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000104'::uuid, NOW() - INTERVAL '17 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000105'::uuid, NOW() - INTERVAL '16 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000106'::uuid, NOW() - INTERVAL '16 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000107'::uuid, NOW() - INTERVAL '15 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000108'::uuid, NOW() - INTERVAL '15 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000109'::uuid, NOW() - INTERVAL '14 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0001-4001-8001-000000000110'::uuid, NOW() - INTERVAL '14 days');

-- Блок 02 — все 9 материалов
INSERT INTO material_progress (student_id, material_id, viewed_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000201'::uuid, NOW() - INTERVAL '12 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000202'::uuid, NOW() - INTERVAL '12 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000203'::uuid, NOW() - INTERVAL '11 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000204'::uuid, NOW() - INTERVAL '11 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000205'::uuid, NOW() - INTERVAL '10 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000206'::uuid, NOW() - INTERVAL '10 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000207'::uuid, NOW() - INTERVAL '9 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000208'::uuid, NOW() - INTERVAL '9 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0002-4002-8002-000000000209'::uuid, NOW() - INTERVAL '8 days');

-- Блок 03 — 9 из 15 (5 theory + 4 questions, без practice/homework)
INSERT INTO material_progress (student_id, material_id, viewed_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000301'::uuid, NOW() - INTERVAL '6 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000302'::uuid, NOW() - INTERVAL '6 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000303'::uuid, NOW() - INTERVAL '5 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000304'::uuid, NOW() - INTERVAL '5 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000305'::uuid, NOW() - INTERVAL '4 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000306'::uuid, NOW() - INTERVAL '4 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000307'::uuid, NOW() - INTERVAL '3 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000308'::uuid, NOW() - INTERVAL '3 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '22222222-0003-4003-8003-000000000309'::uuid, NOW() - INTERVAL '2 days');

-- Student2 (Дарья Смирнова) — блок 04 waiting_buddy_confirmation: смотрит все материалы блоков 1-4
-- Сначала блоки 1-3 (для контекста)
INSERT INTO material_progress (student_id, material_id, viewed_at)
SELECT 'd0000000-0000-4000-8000-000000000001'::uuid, id, NOW() - INTERVAL '30 days'
  FROM roadmap_materials WHERE block_id = '11111111-1111-4111-8111-000000000001'::uuid;

INSERT INTO material_progress (student_id, material_id, viewed_at)
SELECT 'd0000000-0000-4000-8000-000000000001'::uuid, id, NOW() - INTERVAL '22 days'
  FROM roadmap_materials WHERE block_id = '11111111-1111-4111-8111-000000000002'::uuid;

INSERT INTO material_progress (student_id, material_id, viewed_at)
SELECT 'd0000000-0000-4000-8000-000000000001'::uuid, id, NOW() - INTERVAL '14 days'
  FROM roadmap_materials WHERE block_id = '11111111-1111-4111-8111-000000000003'::uuid;

INSERT INTO material_progress (student_id, material_id, viewed_at)
SELECT 'd0000000-0000-4000-8000-000000000001'::uuid, id, NOW() - INTERVAL '3 days'
  FROM roadmap_materials WHERE block_id = '11111111-1111-4111-8111-000000000004'::uuid;

-- Student3 (Андрей Носов) — блок 02 in_progress 56%, спит 12 дней.
-- Блок 01 полностью + 5 материалов блока 02 (5/9 ≈ 56%).
INSERT INTO material_progress (student_id, material_id, viewed_at)
SELECT 'd0000000-0000-4000-8000-000000000002'::uuid, id, NOW() - INTERVAL '30 days'
  FROM roadmap_materials WHERE block_id = '11111111-1111-4111-8111-000000000001'::uuid;

INSERT INTO material_progress (student_id, material_id, viewed_at) VALUES
    ('d0000000-0000-4000-8000-000000000002'::uuid, '22222222-0002-4002-8002-000000000201'::uuid, NOW() - INTERVAL '20 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, '22222222-0002-4002-8002-000000000202'::uuid, NOW() - INTERVAL '18 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, '22222222-0002-4002-8002-000000000204'::uuid, NOW() - INTERVAL '15 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, '22222222-0002-4002-8002-000000000205'::uuid, NOW() - INTERVAL '13 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, '22222222-0002-4002-8002-000000000207'::uuid, NOW() - INTERVAL '12 days');

-- =========================================================================
-- 8. BLOCK PROGRESS
-- =========================================================================

-- Михаил: блок 1, 2 — approved (buddy = ivan); блок 3 — in_progress
INSERT INTO block_progress (student_id, block_id, status, approved_by, approved_at, created_at, updated_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'approved', 'b0000000-0000-4000-8000-000000000001'::uuid,
     NOW() - INTERVAL '13 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '13 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'approved', 'b0000000-0000-4000-8000-000000000001'::uuid,
     NOW() - INTERVAL '7 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '7 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'in_progress', NULL, NULL,
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days');

-- Student1 (Дарья): блоки 1-3 approved, блок 4 waiting_buddy_confirmation
INSERT INTO block_progress (student_id, block_id, status, approved_by, approved_at, created_at, updated_at) VALUES
    ('d0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'approved', 'b0000000-0000-4000-8000-000000000001'::uuid,
     NOW() - INTERVAL '25 days', NOW() - INTERVAL '32 days', NOW() - INTERVAL '25 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'approved', 'b0000000-0000-4000-8000-000000000001'::uuid,
     NOW() - INTERVAL '18 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '18 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000003'::uuid,
     'approved', 'b0000000-0000-4000-8000-000000000001'::uuid,
     NOW() - INTERVAL '8 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '8 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
     'waiting_buddy_confirmation', NULL, NULL,
     NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 days');

-- Student2 (Андрей): блок 1 approved, блок 2 in_progress
INSERT INTO block_progress (student_id, block_id, status, approved_by, approved_at, created_at, updated_at) VALUES
    ('d0000000-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
     'approved', 'b0000000-0000-4000-8000-000000000001'::uuid,
     NOW() - INTERVAL '24 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '24 days'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
     'in_progress', NULL, NULL,
     NOW() - INTERVAL '22 days', NOW() - INTERVAL '12 days');

-- =========================================================================
-- 9. USER ACHIEVEMENTS — Михаил Кротов (9 ачивок)
-- Первый шаг, Разогрев, Фокус, Профиль оформлен, Блок 1 закрыт, Блок 2 закрыт,
-- Первый mock, Первый real, Серия real ×3
-- =========================================================================

INSERT INTO user_achievements (user_id, achievement_id, received_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000001'::uuid, NOW() - INTERVAL '18 days'),  -- Первый шаг
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000012'::uuid, NOW() - INTERVAL '17 days'),  -- Профиль оформлен
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000002'::uuid, NOW() - INTERVAL '15 days'),  -- Разогрев (10 материалов)
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000004'::uuid, NOW() - INTERVAL '13 days'),  -- Блок 1 закрыт
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000003'::uuid, NOW() - INTERVAL '9 days'),   -- Фокус (25 материалов)
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000009'::uuid, NOW() - INTERVAL '8 days'),   -- Первый mock
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000005'::uuid, NOW() - INTERVAL '7 days'),   -- Блок 2 закрыт
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000010'::uuid, NOW() - INTERVAL '5 days'),   -- Первый real
    ('c0000000-0000-4000-8000-000000000001'::uuid, '33333333-0000-4000-8000-000000000011'::uuid, NOW() - INTERVAL '1 days');   -- Серия real ×3

-- =========================================================================
-- 10. BONUS TRANSACTIONS — Михаил Кротов
-- Сводный итог:
--   +10 +25 +50 +20 +40 +50 +30 +50 +120 = +395  (ачивки)
--   +3 945                                       (manual_adjustment "бонус за активность beta-тестера")
--   −920                                          (discount_conversion → 9.20%)
--   ───────────────────────────────────────────
--    3 420
-- =========================================================================

INSERT INTO bonus_transactions (user_id, type, amount, reason, source_type, source_id, created_at) VALUES
    -- Ачивки (всегда +)
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  10, 'Ачивка «Первый шаг»',         'achievement', '33333333-0000-4000-8000-000000000001', NOW() - INTERVAL '18 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  20, 'Ачивка «Профиль оформлен»',   'achievement', '33333333-0000-4000-8000-000000000012', NOW() - INTERVAL '17 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  25, 'Ачивка «Разогрев»',           'achievement', '33333333-0000-4000-8000-000000000002', NOW() - INTERVAL '15 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  40, 'Ачивка «Блок 1 закрыт»',      'achievement', '33333333-0000-4000-8000-000000000004', NOW() - INTERVAL '13 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  50, 'Ачивка «Фокус»',              'achievement', '33333333-0000-4000-8000-000000000003', NOW() - INTERVAL '9 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  30, 'Ачивка «Первый mock»',        'achievement', '33333333-0000-4000-8000-000000000009', NOW() - INTERVAL '8 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  50, 'Ачивка «Блок 2 закрыт»',      'achievement', '33333333-0000-4000-8000-000000000005', NOW() - INTERVAL '7 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward',  50, 'Ачивка «Первый real»',        'achievement', '33333333-0000-4000-8000-000000000010', NOW() - INTERVAL '5 days'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'achievement_reward', 120, 'Ачивка «Серия real ×3»',      'achievement', '33333333-0000-4000-8000-000000000011', NOW() - INTERVAL '1 days'),

    -- Manual adjustment от Admin (бонус beta-тестера)
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'manual_adjustment', 3945, 'Бонус за активность beta-тестера', 'user', 'a0000000-0000-4000-8000-000000000001', NOW() - INTERVAL '6 days'),

    -- Конвертация бонусов в скидку 9.20%
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'discount_conversion', -920, 'Конвертация в скидку 9.20%', NULL, NULL, NOW() - INTERVAL '3 days');

-- =========================================================================
-- 11. DISCOUNT CONVERSIONS — Михаил
-- 920 бонусов → 9.20% скидки (курс: 100 бонусов = 1%, cap 15%).
-- =========================================================================

INSERT INTO discount_conversions (user_id, bonus_amount, discount_percent, created_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, 920, 9.20, NOW() - INTERVAL '3 days');

-- =========================================================================
-- 12. INTERVIEWS — Михаил (2 mock + 3 real)
-- =========================================================================

INSERT INTO interviews (id, type, student_id, buddy_id, url, company, position, grade, stack, date, status, result, feedback, created_at, updated_at) VALUES
    ('44444444-0000-4000-8000-000000000001'::uuid, 'mock',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'b0000000-0000-4000-8000-000000000001'::uuid,
     NULL, NULL, 'Go Developer', 'middle', 'Go, PostgreSQL, Docker',
     (NOW() - INTERVAL '8 days')::date, 'completed', 'no_result',
     'Хорошо разобрался с channels, но забыл про context cancellation в worker pool. Доработать.',
     NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

    ('44444444-0000-4000-8000-000000000002'::uuid, 'mock',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'b0000000-0000-4000-8000-000000000001'::uuid,
     NULL, NULL, 'Go Developer', 'middle', 'Go, gRPC, Redis',
     (NOW() - INTERVAL '4 days')::date, 'completed', 'no_result',
     'Заметно прокачался. Уверенно объяснил race condition и graceful shutdown. Готов идти на real.',
     NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

    ('44444444-0000-4000-8000-000000000003'::uuid, 'real',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     NULL,
     'https://career.avito.com/job/12345', 'Авито', 'Middle Go Developer', 'middle', 'Go, Kafka, Postgres',
     (NOW() - INTERVAL '5 days')::date, 'completed', 'reject',
     'Не прошёл секцию по системному дизайну. Просили придумать схему очереди событий — растерялся.',
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),

    ('44444444-0000-4000-8000-000000000004'::uuid, 'real',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     NULL,
     'https://hh.ru/vacancy/87654321', 'Тинькофф', 'Backend Engineer (Go)', 'middle', 'Go, Kafka, ClickHouse',
     (NOW() - INTERVAL '2 days')::date, 'completed', 'pending',
     'Алгоритмы прошёл, ждём ответ HR после финального.',
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

    ('44444444-0000-4000-8000-000000000005'::uuid, 'real',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     NULL,
     'https://career.ozon.ru/jobs/55555', 'Ozon', 'Middle Go Developer', 'middle', 'Go, RabbitMQ, MongoDB',
     (NOW() - INTERVAL '1 days')::date, 'completed', 'offer',
     'Оффер! 240k gross. Дали 7 дней на обдумывание.',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days');

-- =========================================================================
-- 13. ONE-ON-ONE REQUEST — Михаил (pending, ачивка ещё не получена)
-- =========================================================================

INSERT INTO one_on_one_requests (id, student_id, status, created_at, updated_at) VALUES
    ('55555555-0000-4000-8000-000000000001'::uuid,
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'pending',
     NOW() - INTERVAL '6 hours',
     NOW() - INTERVAL '6 hours');

-- =========================================================================
-- 14. CALENDAR EVENTS — Михаил
-- =========================================================================

INSERT INTO calendar_events (id, title, student_id, buddy_id, type, start_datetime, end_datetime, description, reminder_enabled) VALUES
    ('66666666-0000-4000-8000-000000000001'::uuid,
     'Mock-интервью с Иваном',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'b0000000-0000-4000-8000-000000000001'::uuid,
     'mock_interview',
     NOW() + INTERVAL '1 days' + INTERVAL '4 hours',
     NOW() + INTERVAL '1 days' + INTERVAL '5 hours',
     'Mock на тему concurrency и context.',
     TRUE),

    ('66666666-0000-4000-8000-000000000002'::uuid,
     'Ревью блока 3 (Concurrency)',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     'b0000000-0000-4000-8000-000000000001'::uuid,
     'block_review',
     NOW() + INTERVAL '2 days' + INTERVAL '3 hours',
     NOW() + INTERVAL '2 days' + INTERVAL '4 hours',
     'Проверим домашку и закроем блок.',
     TRUE),

    ('66666666-0000-4000-8000-000000000003'::uuid,
     'Собеседование Авито (повторное)',
     'c0000000-0000-4000-8000-000000000001'::uuid,
     NULL,
     'real_interview',
     NOW() + INTERVAL '4 days' + INTERVAL '5 hours',
     NOW() + INTERVAL '4 days' + INTERVAL '6 hours',
     'Финальная техническая секция.',
     FALSE);

-- =========================================================================
-- 15. ACTIVITY EVENTS — Михаил (для красивой ленты в Buddy view)
-- =========================================================================

INSERT INTO activity_events (user_id, actor_id, type, source_type, source_id, metadata, created_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'material_viewed', 'material', '22222222-0001-4001-8001-000000000101', '{"title":"A Tour of Go"}'::jsonb, NOW() - INTERVAL '18 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000001', '{"title":"Первый шаг","reward":10}'::jsonb, NOW() - INTERVAL '18 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000012', '{"title":"Профиль оформлен","reward":20}'::jsonb, NOW() - INTERVAL '17 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000002', '{"title":"Разогрев","reward":25}'::jsonb, NOW() - INTERVAL '15 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid,
     'block_approved', 'block', '11111111-1111-4111-8111-000000000001', '{"title":"Foundations","block_index":1}'::jsonb, NOW() - INTERVAL '13 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000004', '{"title":"Блок 1 закрыт","reward":40}'::jsonb, NOW() - INTERVAL '13 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'interview_added', 'interview', '44444444-0000-4000-8000-000000000001', '{"type":"mock","grade":"middle"}'::jsonb, NOW() - INTERVAL '8 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000009', '{"title":"Первый mock","reward":30}'::jsonb, NOW() - INTERVAL '8 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid,
     'block_approved', 'block', '11111111-1111-4111-8111-000000000002', '{"title":"Interfaces & Errors","block_index":2}'::jsonb, NOW() - INTERVAL '7 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'interview_added', 'interview', '44444444-0000-4000-8000-000000000003', '{"type":"real","company":"Авито"}'::jsonb, NOW() - INTERVAL '6 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000010', '{"title":"Первый real","reward":50}'::jsonb, NOW() - INTERVAL '5 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'interview_added', 'interview', '44444444-0000-4000-8000-000000000005', '{"type":"real","company":"Ozon","result":"offer"}'::jsonb, NOW() - INTERVAL '2 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked', 'achievement', '33333333-0000-4000-8000-000000000011', '{"title":"Серия real ×3","reward":120}'::jsonb, NOW() - INTERVAL '1 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'one_on_one_requested', 'one_on_one_request', '55555555-0000-4000-8000-000000000001', '{}'::jsonb, NOW() - INTERVAL '6 hours');

-- Activity для Дарьи (Buddy видит её waiting_buddy_confirmation)
INSERT INTO activity_events (user_id, actor_id, type, source_type, source_id, metadata, created_at) VALUES
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid,
     'block_submitted', 'block', '11111111-1111-4111-8111-000000000004', '{"title":"Tests & Benchmarks","block_index":4}'::jsonb, NOW() - INTERVAL '1 days'),
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid,
     'block_approved', 'block', '11111111-1111-4111-8111-000000000003', '{"title":"Concurrency","block_index":3}'::jsonb, NOW() - INTERVAL '8 days');

-- Activity для Андрея (sleep-state — последняя 12 дней назад)
INSERT INTO activity_events (user_id, actor_id, type, source_type, source_id, metadata, created_at) VALUES
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'd0000000-0000-4000-8000-000000000002'::uuid,
     'material_viewed', 'material', '22222222-0002-4002-8002-000000000207', '{"title":"Реализуй io.Reader-обёртку"}'::jsonb, NOW() - INTERVAL '12 days');

-- =========================================================================
-- 16. NOTIFICATIONS — Михаил
-- =========================================================================

INSERT INTO notifications (user_id, type, title, body, metadata, is_read, created_at) VALUES
    ('c0000000-0000-4000-8000-000000000001'::uuid,
     'achievement_unlocked',
     'Получена ачивка «Серия real ×3»',
     '+120 бонусов. Ты прошёл три real-собеседования подряд!',
     '{"achievement_id":"33333333-0000-4000-8000-000000000011","reward":120}'::jsonb,
     FALSE, NOW() - INTERVAL '1 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid,
     'block_approved',
     'Buddy подтвердил блок «Interfaces & Errors»',
     'Иван Менторов закрыл блок 2. +50 бонусов.',
     '{"block_id":"11111111-1111-4111-8111-000000000002"}'::jsonb,
     TRUE, NOW() - INTERVAL '7 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid,
     'calendar_event_created',
     'Запланировано mock-интервью',
     'Завтра в 16:00 — mock с Иваном по теме concurrency.',
     '{"event_id":"66666666-0000-4000-8000-000000000001"}'::jsonb,
     FALSE, NOW() - INTERVAL '4 hours'),

    ('c0000000-0000-4000-8000-000000000001'::uuid,
     'discount_converted',
     'Бонусы конвертированы в скидку',
     '920 бонусов → скидка 9.20%.',
     '{"bonus_amount":920,"discount_percent":9.20}'::jsonb,
     TRUE, NOW() - INTERVAL '3 days'),

    ('c0000000-0000-4000-8000-000000000001'::uuid,
     'one_on_one_requested',
     'Заявка на 1×1 отправлена',
     'Admin рассмотрит её в ближайшее время.',
     '{"request_id":"55555555-0000-4000-8000-000000000001"}'::jsonb,
     FALSE, NOW() - INTERVAL '6 hours');

-- Notifications для buddy (новая заявка от Дарьи)
INSERT INTO notifications (user_id, type, title, body, metadata, is_read, created_at) VALUES
    ('b0000000-0000-4000-8000-000000000001'::uuid,
     'block_submitted',
     'Дарья Смирнова сдала блок 4',
     'Tests & Benchmarks ждёт твоего подтверждения.',
     '{"student_id":"d0000000-0000-4000-8000-000000000001","block_id":"11111111-1111-4111-8111-000000000004"}'::jsonb,
     FALSE, NOW() - INTERVAL '1 days');

-- Notifications для admin (новая заявка 1×1)
INSERT INTO notifications (user_id, type, title, body, metadata, is_read, created_at) VALUES
    ('a0000000-0000-4000-8000-000000000001'::uuid,
     'one_on_one_requested',
     'Новая заявка на 1×1',
     'Михаил Кротов запросил персональную консультацию.',
     '{"request_id":"55555555-0000-4000-8000-000000000001","student_id":"c0000000-0000-4000-8000-000000000001"}'::jsonb,
     FALSE, NOW() - INTERVAL '6 hours');

COMMIT;
