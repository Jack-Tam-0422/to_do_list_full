const API_URL = "http://localhost:3000/";

const AddButton = document.getElementById("add-btn");
const ToDoInput = document.getElementById("todo-input");

async function AddToDo() {
  const task = ToDoInput.value.trim();
  if (task === "") {
    alert("Please enter a task.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ task }),
    });
    const newTodo = await response.json();
    if (response.ok) {
      window.location.reload();
    } else {
      alert("Error adding task: " + newTodo.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while adding the task.");
  }
  ToDoInput.value = ""; // Clear the input field after adding the task
}

async function ToggleToDo(button) {
  const todoId = button.getAttribute("data-id");
  const currentCompleted = button.getAttribute("data-completed") === "true";
  try {
    const response = await fetch(`${API_URL}todos/${todoId}/toggle`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed: !currentCompleted }),
    });
    const result = await response.json();
    if (response.ok) {
      button.textContent = currentCompleted ? "No" : "Yes";
      button.setAttribute("data-completed", !currentCompleted);
    } else {
      alert("Error toggling task: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while toggling the task.");
  }
}

AddButton.addEventListener("click", AddToDo);
ToDoInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    AddToDo();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleButtons = document.querySelectorAll(".toggle-btn");
  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => ToggleToDo(button));
  });
});
