document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");

    form.addEventListener("submit", function(event) {
        const prompt = document.getElementById("prompt");
        const numAsks = document.getElementById("numAsks");

        // Check if the prompt is empty
        if (prompt.value.trim() === '') {
            event.preventDefault();
            alert('Please enter a prompt.');
        }

        // Check if numAsks is a valid number
        if (isNaN(numAsks.value) || numAsks.value <= 0) {
            event.preventDefault();
            alert('Please enter a valid number of asks.');
        }
    });
});
