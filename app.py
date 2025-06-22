# ----------------- Imports -----------------
import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
import psycopg2
from psycopg2 import OperationalError

# ----------------- App Config -----------------
app = Flask(__name__)
app.secret_key = "your-secret-key"

# ----------------- PostgreSQL Config -----------------
POSTGRES_CONFIG = {
    'host': 'dpg-d1br9kbe5dus73esr1hg-a',
    'user': 'quiz_db_4gch_user',
    'password': 'kXoWWGPKSjq52aM1H8hX0qp2KFQbj5KZ',
    'dbname': 'quiz_db_4gch'
}
def get_db_connection():
    try:
        return psycopg2.connect(**POSTGRES_CONFIG)
    except OperationalError as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return None

# ----------------- Authentication Routes -----------------
@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db_connection()
        if conn is None:
            flash('Database connection failed!', 'danger')
            return render_template('login.html')

        try:
            cursor = conn.cursor()
            cursor.execute('SELECT username FROM users WHERE username = %s AND password = %s', (username, password))
            user = cursor.fetchone()
            if user:
                session['user'] = username
                flash('Login successful!', 'success')
                return redirect(url_for('quiz_input'))
            else:
                flash('Invalid username or password!', 'danger')
        except Exception as e:
            flash(f'Database error: {e}', 'danger')
        finally:
            cursor.close()
            conn.close()

    return render_template('login.html')

@app.route("/signup", methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db_connection()
        if conn is None:
            flash('Database connection failed!', 'danger')
            return render_template('signup.html')

        try:
            cursor = conn.cursor()
            cursor.execute('SELECT username FROM users WHERE username = %s', (username,))
            if cursor.fetchone():
                flash('Username already exists!', 'danger')
            else:
                cursor.execute('INSERT INTO users (username, password) VALUES (%s, %s)', (username, password))
                conn.commit()
                flash('Signup successful! Please login.', 'success')
                return redirect(url_for('login'))
        except Exception as e:
            flash(f'Database error: {e}', 'danger')
        finally:
            cursor.close()
            conn.close()

    return render_template('signup.html')

@app.route("/logout")
def logout():
    session.pop('user', None)
    session.pop('quiz_attempt', None)
    flash('Logged out successfully!', 'success')
    return redirect(url_for('login'))

# ----------------- Quiz Routes -----------------
@app.route("/", methods=['GET', 'POST'])
def quiz_input():
    if 'user' not in session:
        return redirect(url_for('login'))

    conn = get_db_connection()
    quizzes = []

    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT id, topic, created_at FROM quizzes ORDER BY created_at DESC')

            quizzes = cursor.fetchall()
        except Exception as e:
            flash(f'Database error: {e}', 'danger')
        finally:
            cursor.close()
            conn.close()
    else:
        flash('Database connection failed!', 'danger')

    if request.method == 'POST':
        quiz_id = request.form.get('quiz_id')
        name = request.form.get('name')

        if not quiz_id or not name.strip():
            flash('Quiz selection and name are required!', 'danger')
            return render_template('quiz_input.html', quizzes=quizzes)

        conn = get_db_connection()
        if conn is None:
            flash('Database connection failed!', 'danger')
            return render_template('quiz_input.html', quizzes=quizzes)

        try:
            cursor = conn.cursor()
            cursor.execute('SELECT questions, question_count FROM quizzes WHERE id = %s', (quiz_id,))
            quiz = cursor.fetchone()
            if not quiz:
                flash('Invalid quiz selection!', 'danger')
                return render_template('quiz_input.html', quizzes=quizzes)

            attempt_id = str(uuid.uuid4())
            session['quiz_attempt'] = {
                'attempt_id': attempt_id,
                'quiz_id': quiz_id,
                'name': name,
                'questions': quiz[0] or '',
                'question_count': quiz[1]
            }
            return redirect(url_for('quiz', attempt_id=attempt_id))
        except Exception as e:
            flash(f'Database error: {e}', 'danger')
        finally:
            cursor.close()
            conn.close()

    return render_template('quiz_input.html', quizzes=quizzes)

@app.route("/quiz/<attempt_id>")
def quiz(attempt_id):
    if 'user' not in session or 'quiz_attempt' not in session:
        return redirect(url_for('login'))

    if session['quiz_attempt']['attempt_id'] != attempt_id:
        flash('Invalid quiz attempt!', 'danger')
        return redirect(url_for('quiz_input'))

    questions_text = session['quiz_attempt']['questions'] or ""
    questions_text = questions_text.replace('\r\n', '\n').replace('\r', '\n')

    return render_template('quiz.html',
                           attempt_id=attempt_id,
                           questions=questions_text)

@app.route("/submit_score/<attempt_id>", methods=['POST'])
def submit_score(attempt_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 403

    quiz_data = session.get('quiz_attempt')
    if not quiz_data or quiz_data.get('attempt_id') != attempt_id:
        return jsonify({'error': 'Invalid attempt'}), 400

    data = request.json
    score = data.get('score')

    if not isinstance(score, (int, float)):
        return jsonify({'error': 'Score must be a number'}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO quiz_results (attempt_id, quiz_id, username, name, score, total_questions)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            attempt_id, quiz_data['quiz_id'], session['user'],
            quiz_data['name'], score, quiz_data['question_count']
        ))
        conn.commit()
        return jsonify({'message': 'Score submitted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ----------------- Create Tables -----------------
def create_tables():
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    username VARCHAR(255) PRIMARY KEY,
                    password VARCHAR(255) NOT NULL
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS quizzes (
                    id UUID PRIMARY KEY,
                    username VARCHAR(255),
                    topic TEXT,
                    questions TEXT,
                    question_count INTEGER,
                    option_count INTEGER,
                    difficulty VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS quiz_results (
                    attempt_id UUID PRIMARY KEY,
                    quiz_id UUID,
                    username VARCHAR(255),
                    name VARCHAR(255),
                    score INTEGER,
                    total_questions INTEGER
                )
            ''')
            conn.commit()
        except Exception as e:
            print(f"Error creating tables: {e}")
        finally:
            cursor.close()
            conn.close()

# ----------------- Main -----------------
if __name__ == "__main__":
    create_tables()
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port, host="0.0.0.0")