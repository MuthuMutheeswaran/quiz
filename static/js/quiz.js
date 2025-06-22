let questions = [];

// Shuffle utility
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Parses raw question text and separates questions, options, and answers
function parseQuestions(text) {
  //console.log("Raw questions text:", text);
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error("Questions text is empty or invalid");
    return [];
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const parsedQuestions = [];
  let currentQuestion = null;

  for (const line of lines) {
    if (/^\d+\.\s/.test(line)) {
  if (currentQuestion) parsedQuestions.push(currentQuestion);
  const cleanQuestion = line.replace(/^\d+\.\s*/, '');  // remove "1. ", "2. ", etc.
  currentQuestion = { question: cleanQuestion, options: [], answer: '' };
    } else if (/^[A-Da-d]\)\s/.test(line)) {
      if (currentQuestion) currentQuestion.options.push(line);
    } else if (/^Answer:\s*/i.test(line)) {
      if (currentQuestion) currentQuestion.answer = line.replace(/^Answer:\s*/i, '').trim();
    }
  }
  if (currentQuestion) parsedQuestions.push(currentQuestion);

  // Shuffle questions and options
  shuffleArray(parsedQuestions);
  parsedQuestions.forEach(q => shuffleArray(q.options));

  //console.log("Parsed questions:", parsedQuestions);
  return parsedQuestions;
}

// Display parsed questions
function displayAllQuestions() {
  const questionsListDiv = document.getElementById('questions-list');
  const resultDiv = document.getElementById('result');
  const scoreDiv = document.getElementById('score');
  questionsListDiv.innerHTML = '';

  if (!questions.length) {
    questionsListDiv.innerHTML = '<p>No questions available to display.</p>';
    resultDiv.textContent = '';
    scoreDiv.textContent = '';
    document.getElementById('submit-quiz').style.display = 'none';
    return;
  }

  questions.forEach((question, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-block';
    questionDiv.innerHTML = `<div class="question">${index + 1}.${question.question}</div>`;

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options';
    question.options.forEach(option => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `question-${index}`;
      input.value = option.charAt(0);
      input.required = true;
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + option));
      optionsDiv.appendChild(label);
      optionsDiv.appendChild(document.createElement('br'));
    });

    questionDiv.appendChild(optionsDiv);
    questionsListDiv.appendChild(questionDiv);
  });

  document.getElementById('submit-quiz').style.display = 'inline-block';
}

// Timer logic that persists across refresh
function startTimer(durationInSeconds) {
  const timerDisplay = document.getElementById('timer');
  let startTime = sessionStorage.getItem('quiz_start_time');
  const now = Date.now();

  if (!startTime) {
    startTime = now;
    sessionStorage.setItem('quiz_start_time', startTime);
  } else {
    startTime = parseInt(startTime);
  }

  const endTime = startTime + durationInSeconds * 1000;

  function updateTimer() {
    const currentTime = Date.now();
    const timeLeft = Math.floor((endTime - currentTime) / 1000);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = 'Time Left: 0:00';
      alert("Time's up! Submitting your quiz...");
      sessionStorage.removeItem('quiz_start_time');
      document.getElementById('submit-quiz').click(); // auto-submit
      return;
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `Time Left: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
}

// Score calculation
function calculateScore() {
  let score = 0;
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';

  questions.forEach((question, index) => {
    const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
    const questionResult = document.createElement('div');
    questionResult.className = 'question-result';

    if (selectedOption) {
      const selected = selectedOption.value;
      if (selected.toUpperCase() === question.answer.toUpperCase()) {
        score++;
        questionResult.innerHTML = `<span style="color: green;">Question ${index + 1}: Correct!</span>`;
      } else {
        questionResult.innerHTML = `<span style="color: red;">Question ${index + 1}: Wrong!</span>`;
      }
    } else {
      questionResult.innerHTML = `<span style="color: orange;">Question ${index + 1}: Not answered.</span>`;
    }

    resultDiv.appendChild(questionResult);
  });

  document.getElementById('quiz-form').style.display = 'none';
  document.getElementById('score').textContent = `Final Score: ${score}/${questions.length}`;

  // Clear timer session
  sessionStorage.removeItem('quiz_start_time');

  return score;
}

// Send score to backend
async function submitScore(score) {
  try {
    const response = await fetch(`/submit_score/${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: score })
    });
    const data = await response.json();
    if (response.ok) {
      alert('Score saved successfully!');
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// Initialization
try {
  //console.log(questionsText);
  questions = parseQuestions(questionsText);
  if (!questions.length) {
    document.getElementById('questions-list').innerHTML = '<p>No questions available to display.</p>';
    document.getElementById('result').innerHTML = '';
    document.getElementById('score').innerHTML = '';
    document.getElementById('submit-quiz').style.display = 'none';
  } else {
    displayAllQuestions();
    startTimer(600); // 10 minutes
  }
} catch (error) {
  console.error("Error initializing quiz:", error);
  document.getElementById('questions-list').innerHTML = '<p>Error loading quiz. Please try again.</p>';
  document.getElementById('submit-quiz').style.display = 'none';
}

// Submit handler
document.getElementById('submit-quiz').addEventListener('click', () => {
  const score = calculateScore();
  submitScore(score);
});
