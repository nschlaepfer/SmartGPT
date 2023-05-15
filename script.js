document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");

    form.addEventListener("submit", function(event) {
        const prompt = document.getElementById("prompt");
        const numAsks = document.getElementById("numAsks");
        const output = document.getElementById("output");

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

        // Add your request code here. I'm assuming it's an async function that returns a Promise.
        // Replace with your actual function for making the request.
        makeRequestToServer(prompt.value, numAsks.value)
            .then(response => {
                // append response to output container
                output.innerText += response + '\n';
            })
            .catch(err => {
                // handle error
                output.innerText += 'Error: ' + err.message + '\n';
            });
    });
});

// Replace this with your actual function for making the request to the server.
function makeRequestToServer(prompt, numAsks) {
    return new Promise((resolve, reject) => {
        // dummy implementation for example purposes
        setTimeout(() => resolve('Response from server'), 1000);
    });
}
