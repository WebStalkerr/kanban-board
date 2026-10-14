//Перевірка, що файл підключений і виконується
console.log('script.js підключено');

// колонкам "To Do" / "In Progress" / "Done" з index.html
const tasks = [
    { title: 'Лягти спати вчасно', status: 'To Do' },
    { title: 'КП№6', status: 'In Progress' },
    { title: 'Повечеряти', status: 'Done' },
    { title: 'Прибрати кімнату', status: 'Done' },
];

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
