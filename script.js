// Фреймворк: Vue 3 (підключення через CDN, без збірки).
// Обрано, бо шаблон Vue майже збігається зі звичайним HTML дошки, а для React довелося б додатково підключати Babel для JSX.
console.log('script.js підключено');

// Модель даних картки: { id: число, title: рядок, column: 'todo' | 'doing' | 'done' }
// id унікальний (для карток з API це id із JSONPlaceholder, для нових обчислюється як max + 1)
const COLUMN_ORDER = ['todo', 'doing', 'done'];

// Публічний мок-API JSONPlaceholder (https://jsonplaceholder.typicode.com), ресурс /todos, фільтр userId=3
const API_URL = 'https://jsonplaceholder.typicode.com/todos?userId=3';

// Схема IndexedDB: база KanbanDB, версія 1, object store "cards" з ключем id
const DB_NAME = 'KanbanDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const columnSelect = document.querySelector('#task-column');
const loadingEl = document.querySelector('#loading');
const errorEl = document.querySelector('#error');
const refreshBtn = document.querySelector('#refresh-btn');
const boardEl = document.querySelector('#board');

// підсумок за колонками у консоль
function countByStatus(taskList) {
    const counts = { todo: 0, doing: 0, done: 0 };
    for (const task of taskList) {
        if (task.column in counts) {
            counts[task.column]++;
        }
    }
    console.log(`Усього задач: ${taskList.length}`);
    console.log(`To Do: ${counts.todo}, In Progress: ${counts.doing}, Done: ${counts.done}`);
}

// ключ, під яким масив карток лежить у localStorage
const LS_KEY = 'kanbanCards';

// Зберігає масив карток у localStorage як JSON рядок
function saveToLocalStorage(items) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Не вдалося записати в localStorage:', error);
    }
}

// Читає масив карток; якщо даних немає чи вони пошкоджені, повертає порожній масив
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

// Відкриває базу; при першому запуску створює object store
function openDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB не підтримується браузером'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.close();
                reject(new Error(`У базі ${DB_NAME} немає сховища "${STORE_NAME}". Видаліть базу в DevTools і перезавантажте сторінку`));
                return;
            }
            db.onversionchange = () => db.close();
            resolve(db);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => console.warn('Відкриття IndexedDB заблоковано іншою вкладкою');
    });
}

// Додає картку (put: створює запис або замінює існуючий з тим самим id)
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Оновлює картку: той самий put з тим самим id, напр. переміщення між колонками
async function updateItem(item) {
    return addItem(item);
}

// Читає всі картки (у порядку зростання id)
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Видаляє картку за id
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Повністю замінює вміст сховища переданим масивом (одна транзакція)
async function replaceAllItems(items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

const MIGRATED_KEY = 'kanbanMigrated';

// Одноразово переносить картки з localStorage в IndexedDB.
// Повертає кількість перенесених карток 
async function migrateFromLocalStorage() {
    if (localStorage.getItem(MIGRATED_KEY) === 'true') {
        return 0;   // вже виконувалась
    }

    const existing = await getAllItems();
    const legacy = loadFromLocalStorage();
    let migrated = 0;

    if (existing.length === 0 && legacy.length > 0) {
        for (const card of legacy) {
            await addItem(card);
        }
        migrated = legacy.length;
        console.log(`Міграція: перенесено ${migrated} карток із localStorage в IndexedDB`);
    }

    localStorage.setItem(MIGRATED_KEY, 'true');
    return migrated;
}



// Функцію renderTasks (ручний рендер через createElement/innerHTML) прибрано:
// її замінено компонентом TaskCard і директивою v-for у розмітці #board.
// Разом із нею прибрано handleCardClick (тепер подія $emit >>> moveNext)
// та ручний підрахунок виконаних (тепер computed-властивість doneCount).

// показує / ховає індикатор завантаження і блокує кнопку "Оновити"
function showLoading(isLoading) {
    loadingEl.hidden = !isLoading;
    refreshBtn.disabled = isLoading;
}

// показує повідомлення про помилку; порожній рядок ховає елемент
function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = message === '';
}

// зрозуміле повідомлення, якщо IndexedDB недоступна (напр., приватний режим) чи операція провалилась
function showDbError(error) {
    showError('Локальне сховище недоступне, зміни не буде збережено після перезавантаження.');
    console.error('Помилка IndexedDB:', error);
}

// перетворює об'єкт todo з API на картку: { id, title, column }
function mapTodoToTask(todo) {
    return {
        id: todo.id,
        title: todo.title,
        column: todo.completed ? 'done' : 'todo'
    };
}

// наступна колонка для картки або null, якщо вона вже в Done (порядок береться з COLUMN_ORDER)
function nextColumn(column) {
    const index = COLUMN_ORDER.indexOf(column);
    return index >= 0 && index < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[index + 1] : null;
}

// Чекає завершення transition transform на елементі.
// Якщо анімації вимкнено (тривалість 0), повертається одразу
function afterTransition(el) {
    const duration = parseFloat(getComputedStyle(el).transitionDuration) || 0;
    if (duration === 0) return Promise.resolve();

    return new Promise(resolve => {
        const timer = setTimeout(finish, 5000);   // запасний вихід, якщо подія не прийде
        function onEnd(event) {
            if (event.target === el && event.propertyName === 'transform') finish();
        }
        function finish() {
            clearTimeout(timer);
            el.removeEventListener('transitionend', onEnd);
            el.removeEventListener('transitioncancel', onEnd);
            resolve();
        }
        el.addEventListener('transitionend', onEnd);
        el.addEventListener('transitioncancel', onEnd);
    });
}

// FLIP-анімація карток: First (де були) -> Last (де стали) -> Invert (transform назад) -> Play (transition до нуля).
// change: асинхронна зміна даних (IndexedDB + reload); movedId: картка, яку переносить користувач
async function flipCards(change, movedId = null) {
    // First: позиції всіх карток до зміни даних
    const before = new Map();
    for (const el of boardEl.querySelectorAll('.card[data-id]')) {
        before.set(el.dataset.id, el.getBoundingClientRect());
    }

    await change();
    await Vue.nextTick();   // чекаємо, поки Vue оновить DOM

    // Last + Invert
    const shifted = [];
    for (const el of boardEl.querySelectorAll('.card[data-id]')) {
        const first = before.get(el.dataset.id);
        if (!first) {
            // картки раніше не було: анімація появи через @keyframes
            el.classList.add('card--enter');
            el.addEventListener('animationend', () => el.classList.remove('card--enter'), { once: true });
            continue;
        }
        const last = el.getBoundingClientRect();
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (dx === 0 && dy === 0) continue;

        el.style.transition = 'none';                      // миттєво ставимо картку на старе місце
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        if (el.dataset.id === String(movedId)) el.classList.add('is-moving');
        shifted.push(el);
    }
    if (shifted.length === 0) return;

    void boardEl.offsetHeight;   // примусовий reflow: браузер фіксує стартові позиції

    // Play: повертаємо transition із style.css і прибираємо transform
    for (const el of shifted) {
        el.style.transition = '';
        el.style.transform = '';
    }

    const movedEl = shifted.find(el => el.classList.contains('is-moving'));
    await afterTransition(movedEl || shifted[0]);
    movedEl?.classList.remove('is-moving');
}

//ловить випадок, коли в полі лише пробіли
titleInput.addEventListener('input', () => {
    titleInput.setCustomValidity(''); // спочатку повертаємо поле в коректний стан
    if (titleInput.value !== '' && titleInput.value.trim().length < 3) {
        titleInput.setCustomValidity('Назва має містити щонайменше 3 символи (не рахуючи пробілів)');
    }
});

//обробник додавання нових задач
form.addEventListener('submit', event => {
    event.preventDefault(); 

    const title = titleInput.value.trim();
    const column = columnSelect.value;

    vm.addTask(title, column);   // стан змінюється, Vue сам оновить інтерфейс
    form.reset();
});

// taskId потрібен додатково до title і column, щоб картка могла повідомити, яку саме задачу клікнули
// Компонент однієї картки. Усі дані отримує лише через props.
// Клік / Enter / Space: перемістити далі; наведення / фокус: показати, куди піде картка
const TaskCard = {
    name: 'TaskCard',
    props: ['taskId', 'title', 'column'],
    emits: ['moveNext', 'remove', 'preview'],
    computed: {
        isDone() {
            return this.column === 'done';
        }
    },
    template: `
        <article class="card" :class="{ done: isDone }" :data-id="taskId" tabindex="0"
                 @click="$emit('moveNext', taskId)"
                 @keydown.enter.self.prevent="$emit('moveNext', taskId, 'keyboard')"
                 @keydown.space.self.prevent="$emit('moveNext', taskId, 'keyboard')"
                 @mouseenter="$emit('preview', taskId)" @mouseleave="$emit('preview', null)"
                 @focus="$emit('preview', taskId)" @blur="$emit('preview', null)">
            <div class="card-head">
                <h3>{{ title }}</h3>
                <button type="button" class="card-remove" aria-label="Видалити задачу"
                        @click.stop="$emit('remove', taskId)">×</button>
            </div>
        </article>`
};

// Vue-застосунок: стан дошки (tasks) тепер реактивний
const vm = Vue.createApp({
    components: { TaskCard },
    data() {
        return {
            tasks: [],
            targetColumn: null,   // колонка, куди зараз летить картка (drop-target)
            previewColumn: null,  // колонка, куди картка піде після кліку (drop-preview)
            animating: false      // триває анімація переміщення
        };
    },
        computed: {
        todoTasks() {
            return this.tasks.filter(t => t.column === 'todo');
        },
        inProgressTasks() {
            return this.tasks.filter(t => t.column === 'doing');
        },
        doneTasks() {
            return this.tasks.filter(t => t.column === 'done');
        },
        doneCount() {
            return this.doneTasks.length;
        }
    },
    methods: {
        // класи підсвічування для секції колонки: обчислюються зі стану, а не задаються вручну
        zoneClass(column) {
            return {
                'drop-target': this.targetColumn === column,
                'drop-preview': this.previewColumn === column && this.targetColumn !== column
            };
        },
        // наведення / фокус на картці: підсвічуємо колонку, куди вона піде після кліку
        preview(id) {
            if (id === null || this.animating) {
                this.previewColumn = null;
                return;
            }
            const task = this.tasks.find(t => t.id === id);
            this.previewColumn = task ? nextColumn(task.column) : null;
        },
        // джерело даних для рендеру: IndexedDB → реактивний стан
        async reload() {
            this.tasks = await getAllItems();
        },
        async addTask(title, column) {
            try {
                const newTask = {
                    id: Math.max(0, ...this.tasks.map(t => t.id)) + 1,
                    title,
                    column
                };
                await flipCards(async () => {
                    await addItem(newTask);
                    await this.reload();
                });
            } catch (error) {
                showDbError(error);
            }
        },
        // клік по картці: put з новим column + анімація переміщення і підсвічування зони
        async moveNext(id) {
            if (this.animating) return;   // нове переміщення лише після завершення попереднього
            const task = this.tasks.find(t => t.id === id);
            const target = task ? nextColumn(task.column) : null;
            if (!target) return;          // картки немає або вона вже в Done

            this.animating = true;
            this.previewColumn = null;
            this.targetColumn = target;   // підсвічуємо зону призначення
            try {
                await flipCards(async () => {
                    await updateItem({ id: task.id, title: task.title, column: target });
                    await this.reload();
                }, task.id);
            } catch (error) {
                showDbError(error);
            } finally {
                this.targetColumn = null;   // анімація завершена: знімаємо підсвічування
                this.animating = false;
            }

        },
        async removeTask(id) {
            this.previewColumn = null;
            try {
                await flipCards(async () => {
                    await deleteItem(id);
                    await this.reload();
                });
            } catch (error) {
                showDbError(error);
            }
        }
    }
}).mount('#board');

refreshBtn.addEventListener('click', loadData);

// Завантажує задачі з JSONPlaceholder (GET https://jsonplaceholder.typicode.com/todos?userId=3),
// completed: true → колонка Done, false - To Do; помилки показує в #error
async function loadData() {
    showLoading(true);
    showError('');       // ховаємо стару помилку при повторній спробі
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Сервер відповів кодом ${response.status}`);
        }
        const data = await response.json();

        await replaceAllItems(data.map(mapTodoToTask));   // записуємо дані з API в IndexedDB
        await vm.reload();                                // рендеримо з IndexedDB
        countByStatus(vm.tasks);
    } 
    catch (error) {
        showError('Дошку тимчасово не вдалося завантажити');  
        console.error('Помилка завантаження задач:', error); 
    }
    finally {
        showLoading(false);  // зникає і при успіху, і при помилці
    }
}

// перший запуск: у localStorage порожньо, тож беремо стартові дані з API
// Початкове завантаження: міграція → читання з IndexedDB → якщо порожньо, дані з API
async function initBoard() {
    try {
        await migrateFromLocalStorage();
        await vm.reload();
        if (vm.tasks.length === 0) {
            await loadData();
        }
    } catch (error) {
        showDbError(error);
    }
}

initBoard();