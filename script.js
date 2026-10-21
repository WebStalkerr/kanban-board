//Перевірка, що файл підключений і виконується
console.log('script.js підключено');

//прибираємо статичні картки-заглушки
document.querySelectorAll('article.card').forEach(card => card.remove());


// колонкам "To Do" / "In Progress" / "Done" з index.html
const tasks = [
    { title: 'Лягти спати вчасно', status: 'To Do', column: 'todo' },
    { title: 'КП№7', status: 'In Progress', column: 'inprogress' },
    { title: 'Повечеряти', status: 'Done', column: 'done'  },
    { title: 'Прибрати кімнату', status: 'Done', column: 'done'  }
];

//вибір контейнерів і елемента-підсумку
const todoList = document.querySelector('#todo-list');
const inProgressList = document.querySelector('#inprogress-list');
const doneList = document.querySelector('#done-list');
const doneCountEl = document.querySelector('#done-count');

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

// і повертає true/false, чи вона має статус 'Done'
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