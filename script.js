//Перевірка, що файл підключений і виконується
console.log('script.js підключено');

//прибираємо статичні картки-заглушки
document.querySelectorAll('article.card').forEach(card => card.remove());

//порядок колонок і відповідність ключа до тексту статусу
const COLUMN_ORDER = ['todo', 'inprogress', 'done'];
const STATUS_BY_COLUMN = {
    todo: 'To Do',
    inprogress: 'In Progress',
    done: 'Done'
};


// колонкам "To Do" / "In Progress" / "Done" з index.html
const tasks = [
    { id: 1, title: 'Лягти спати вчасно', status: 'To Do', column: 'todo' },
    { id: 2, title: 'КП№8', status: 'In Progress', column: 'inprogress' },
    { id: 3, title: 'Повечеряти', status: 'Done', column: 'done' },
    { id: 4, title: 'Прибрати кімнату', status: 'Done', column: 'done' }
];
let nextId = tasks.length + 1;

//вибір контейнерів і елемента-підсумку
const todoList = document.querySelector('#todo-list');
const inProgressList = document.querySelector('#inprogress-list');
const doneList = document.querySelector('#done-list');
const doneCountEl = document.querySelector('#done-count');

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const columnSelect = document.querySelector('#task-column');

// Відповідність значення task.column до контейнера
const containers = {
    todo: todoList,
    inprogress: inProgressList,
    done: doneList
};

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

// Перевірка isDone на кожній задачі окремо
for (const task of tasks) {
    console.log(`isDone('${task.title}') = ${isDone(task)}`);
}

//Консольний вивід
countByStatus(tasks);
logDoneTasks(tasks);

// Очищає три колонки, створює article.card для кожної задачі,
// додає її в контейнер за task.column і оновлює лічильник виконаних
function renderTasks(taskList) {
    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    doneList.innerHTML = '';

    let doneTotal = 0;

    for (const task of taskList) {
        const container = containers[task.column];
        if (!container) {
            console.warn(`Невідома колонка "${task.column}" у задачі "${task.title}"`);
            continue;

        }
        
        //створення елементів і заповнення текстом
        const card = document.createElement('article');
        card.classList.add('card');

        const title = document.createElement('h3');
        title.textContent = task.title;
        card.append(title);

        //атрибут data-status і умовний клас
        card.dataset.status = task.status;
        card.dataset.id = task.id;
        if (isDone(task)) {
            card.classList.add('done');
            doneTotal++;
        }

        //додаємо в потрібну колонку (всередині циклу)
        container.append(card);
        
    } 

    //оновлюємо вже наявний елемент
    doneCountEl.textContent = `Виконано: ${doneTotal}`;
}

//рендер при завантаженні сторінки
renderTasks(tasks);

//ставить задачі колонку й узгоджений з нею статус
function setColumn(task, column) {
    task.column = column;
    task.status = STATUS_BY_COLUMN[column];
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

    const newTask = { id: nextId++, title };
    setColumn(newTask, column);
    tasks.push(newTask);

    renderTasks(tasks);
    form.reset();
});

//клік на картку переміщує задачу до наступної колонки, обробник на кожен із трьох контейнерів
function handleCardClick(event) {
    const card = event.target.closest('article.card');
    if (!card) return; // клік по порожньому місцю контейнера

    const task = tasks.find(t => t.id === Number(card.dataset.id));
    if (!task) return;

    const index = COLUMN_ORDER.indexOf(task.column);
    if (index === COLUMN_ORDER.length - 1) {
        return; // задача вже в Done, наступної колонки немає
    }

    setColumn(task, COLUMN_ORDER[index + 1]);
    renderTasks(tasks);
}

for (const container of Object.values(containers)) {
    container.addEventListener('click', handleCardClick);
}