// Фреймворк: Vue 3 (підключення через CDN, без збірки).
// Обрано, бо шаблон Vue майже збігається зі звичайним HTML дошки, а для React довелося б додатково підключати Babel для JSX.
console.log('script.js підключено');

//порядок колонок і відповідність ключа до тексту статусу
const COLUMN_ORDER = ['todo', 'inprogress', 'done'];
const STATUS_BY_COLUMN = {
    todo: 'To Do',
    inprogress: 'In Progress',
    done: 'Done'
};

// Публічний мок-API JSONPlaceholder (https://jsonplaceholder.typicode.com), ресурс /todos, фільтр userId=3
const API_URL = 'https://jsonplaceholder.typicode.com/todos?userId=3';

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const columnSelect = document.querySelector('#task-column');
const loadingEl = document.querySelector('#loading');
const errorEl = document.querySelector('#error');
const refreshBtn = document.querySelector('#refresh-btn');

// Підраховує, скільки задач припадає на кожен статус, і виводить підсумок у консоль
function countByStatus(taskList) {
    let todoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;

    for (const task of taskList) {
        if (task.status === 'To Do') {
            todoCount++;
        } else if (task.status === 'In Progress') {
            inProgressCount++;
        } else if (task.status === 'Done') {
            doneCount++;
        }
    }

    console.log(`Усього задач: ${taskList.length}`);
    console.log(`To Do: ${todoCount}`);
    console.log(`In Progress: ${inProgressCount}`);
    console.log(`Done: ${doneCount}`);
}

// текстовою міткою і виводить список у консоль
function logDoneTasks(taskList) {
    for (const task of taskList) {
        const label = task.status === 'Done' ? 'Завершено' : 'Не завершено';
        console.log(`${task.title} — ${label}`);
    }
}

// повертає true/false, якщо вона має статус 'Done'
const isDone = task => task.status === 'Done';

// Функцію renderTasks (ручний рендер через createElement/innerHTML) прибрано:
// її замінено компонентом TaskCard і директивою v-for у розмітці #board.
// Разом із нею прибрано handleCardClick (тепер подія $emit >>> moveNext)
// та ручний підрахунок виконаних (тепер computed-властивість doneCount).

//ставить задачі колонку й узгоджений з нею статус
function setColumn(task, column) {
    task.column = column;
    task.status = STATUS_BY_COLUMN[column];
}

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

// перетворює об'єкт todo з API на задачу формату нашої дошки
function mapTodoToTask(todo) {
    const column = todo.completed ? 'done' : 'todo';
    return {
        id: todo.id,
        title: todo.title,
        status: STATUS_BY_COLUMN[column],
        column: column
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

loadData();

// Компонент однієї картки. Усі дані отримує лише через props, глобальних змінних не чіпає.
// taskId потрібен додатково до title і column, щоб картка могла повідомити, яку саме задачу клікнули
const TaskCard = {
    name: 'TaskCard',
    props: ['taskId', 'title', 'column'],
    emits: ['moveNext'],
    computed: {
        isDone() {
            return this.column === 'done';
        }
    },
    template: `
        <article class="card" :class="{ done: isDone }"
                 @click="$emit('moveNext', taskId)">
            <h3>{{ title }}</h3>
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
            return this.tasks.filter(t => t.column === 'inprogress');
        },
        doneTasks() {
            return this.tasks.filter(t => t.column === 'done');
        },
        doneCount() {
            return this.doneTasks.length;
        }
    },
    methods: {
        // додає нову задачу; id вираховується зі стану
        addTask(title, column) {
            const newTask = {
                id: Math.max(0, ...this.tasks.map(t => t.id)) + 1,
                title
            };
            setColumn(newTask, column);
            this.tasks.push(newTask);
        },
        // евент кліку по картці переносить задачу до наступної колонки
        moveNext(id) {
            const task = this.tasks.find(t => t.id === id);
            if (!task) return;

            const index = COLUMN_ORDER.indexOf(task.column);
            if (index === COLUMN_ORDER.length - 1) {
                return;
            }

            setColumn(task, COLUMN_ORDER[index + 1]);
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

        vm.tasks = data.map(mapTodoToTask);   // нове значення реактивного стану
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

loadData();
