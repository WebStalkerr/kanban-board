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
const DB_VERSION = 0;
const STORE_NAME = 'cards';

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const columnSelect = document.querySelector('#task-column');
const loadingEl = document.querySelector('#loading');
const errorEl = document.querySelector('#error');
const refreshBtn = document.querySelector('#refresh-btn');

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
const TaskCard = {
    name: 'TaskCard',
    props: ['taskId', 'title', 'column'],
    emits: ['moveNext', 'remove'],
    computed: {
        isDone() {
            return this.column === 'done';
        }
    },
    template: `
        <article class="card" :class="{ done: isDone }"
                 @click="$emit('moveNext', taskId)">
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
            tasks: []
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
                await addItem(newTask);
                await this.reload();
            } catch (error) {
                showDbError(error);
            }
        },
        async moveNext(id) {
            const task = this.tasks.find(t => t.id === id);
            if (!task) return;

            const index = COLUMN_ORDER.indexOf(task.column);
            if (index === COLUMN_ORDER.length - 1) {
                return;
            }

            // put з тим самим id і новим column; передаємо звичайний об'єкт, а не Proxy
            await updateItem({ id: task.id, title: task.title, column: COLUMN_ORDER[index + 1] });
            await this.reload();
        },
        async removeTask(id) {
            await deleteItem(id);
            await this.reload();
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