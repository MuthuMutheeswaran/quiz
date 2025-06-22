document.getElementById('quiz-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const topic = document.getElementById('topic').value;
  const questionCount = document.getElementById('question-count').value;
  const optionCount = document.getElementById('option-count').value;
  const difficulty = document.getElementById('difficulty').value;
  const output = document.getElementById('output');
  const downloadLink = document.getElementById('download-link');
  const startQuizLink = document.getElementById('start-quiz');

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        questions: questionCount,
        options: optionCount,
        difficulty
      })
    });

    const data = await response.json();
    if (response.ok) {
      output.innerHTML = `<pre>${data.questions}</pre>`;
      downloadLink.style.display = 'inline-block';
      downloadLink.href = `/downloads/${data.file}`;
      startQuizLink.style.display = 'inline-block';

      // Save the quiz_id to sessionStorage to use later if needed
      sessionStorage.setItem('quiz_id', data.quiz_id);
    } else {
      output.innerHTML = `<p style="color: red;">${data.error}</p>`;
    }
  } catch (error) {
    output.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
});

function add() {
  const quizId = sessionStorage.getItem('quiz_id');
  if (!quizId) {
    alert("No quiz available to add. Please generate first.");
    return;
  }

  alert("Quiz questions have been added successfully to the database.");
}
