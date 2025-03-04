const displayResult = document.getElementById('displayResult');

function display(input) {
    displayResult.value += input;
}

function clearScreen() {
    displayResult.value = "";
}

function calculate(input) {
    try{displayResult.value = eval(displayResult.value);
        displayResult.append(input);
    } catch {
        displayResult.value = "Error";
    }
}