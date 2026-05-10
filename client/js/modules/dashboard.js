'use strict';

window.DashboardModule = function DashboardModule() {
    this.stickyId  = 'dashboard-sticky-note';
    this.todoInputId = 'todo-input';
    this.todoBtnId   = 'btn-add-todo';
    this.todoListId  = 'todo-list';
};

DashboardModule.prototype.init = function () {
    this.loadData();
    this.setupListeners();
};

DashboardModule.prototype.setupListeners = function () {
    var self = this;

    var sticky = document.getElementById(this.stickyId);
    if (sticky) {
        sticky.addEventListener('input', function () { self.saveData(); });
    }

    var btn   = document.getElementById(this.todoBtnId);
    var input = document.getElementById(this.todoInputId);
    if (btn && input) {
        btn.addEventListener('click', function () { self.addTodo(); });
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') self.addTodo();
        });
    }
};

DashboardModule.prototype.addTodo = function () {
    var input = document.getElementById(this.todoInputId);
    var text  = input.value.trim();
    if (!text) return;

    var item = { id: Date.now(), text: text, completed: false };
    this.renderTodo(item);
    input.value = '';
    this.saveData();
};

DashboardModule.prototype.renderTodo = function (item) {
    var self = this;
    var list = document.getElementById(this.todoListId);
    if (!list) return;

    var li = document.createElement('li');
    li.className = 'todo-item' + (item.completed ? ' completed' : '');
    li.setAttribute('data-id', item.id);

    li.innerHTML = [
        '<button class="btn-done" title="Toggle Done">',
        '<span class="material-icons">' + (item.completed ? 'check_circle' : 'radio_button_unchecked') + '</span>',
        '</button>',
        '<span class="todo-text">' + item.text + '</span>',
        '<button class="btn-delete" title="Delete"><span class="material-icons">delete</span></button>'
    ].join('');

    li.querySelector('.btn-done').addEventListener('click', function () {
        item.completed = !item.completed;
        li.classList.toggle('completed');
        this.querySelector('.material-icons').textContent = item.completed ? 'check_circle' : 'radio_button_unchecked';
        self.saveData();
    });

    li.querySelector('.btn-delete').addEventListener('click', function () {
        li.remove();
        self.saveData();
    });

    list.appendChild(li);
};

DashboardModule.prototype.saveData = function () {
    var sticky = document.getElementById(this.stickyId);
    var todoItems = [];
    document.querySelectorAll('.todo-item').forEach(function (el) {
        todoItems.push({
            id:        el.getAttribute('data-id'),
            text:      el.querySelector('.todo-text').textContent,
            completed: el.classList.contains('completed')
        });
    });

    var data = {
        sticky: sticky ? sticky.value : '',
        todos:  todoItems
    };

    
    if (window.FileStore) {
        window.FileStore.set('dashboard', data);
    }
};

DashboardModule.prototype.loadData = function () {
    if (!window.FileStore) return;
    var data = window.FileStore.get('dashboard');
    if (!data) return;

    try {
        var sticky = document.getElementById(this.stickyId);
        if (sticky && data.sticky) sticky.value = data.sticky;

        if (data.todos) {
            var self = this;
            data.todos.forEach(function (item) { self.renderTodo(item); });
        }
    } catch (e) {
        console.error('Dashboard load failure:', e);
    }
};
