import React, { useState } from "react";

const questions = [
  {
    question: "Hva er forbrukeratferd?",
    options: [
      "Studiet av hvordan forbrukere tar beslutninger",
      "Kun økonomiske aspekter ved forbruk",
      "Kun psykologiske faktorer i kjøpsprosessen",
      "Hvordan bedrifter lager markedsføringsstrategier",
    ],
    correct: 0,
    explanation: "Forbrukeratferd er studiet av hvordan forbrukere tar beslutninger, påvirket av både psykologiske og økonomiske faktorer."
  },
  {
    question: "Hva står STP-modellen for?",
    options: [
      "Segmentering, Testing, Posisjonering",
      "Strategi, Taktikk, Planlegging",
      "Segmentering, Targeting, Posisjonering",
      "Statistikk, Teknologi, Psykologi",
    ],
    correct: 2,
    explanation: "STP-modellen står for Segmentering, Targeting og Posisjonering og brukes i markedsføring for å identifisere og nå ut til målgrupper."
  },
  {
    question: "Hva er kognitiv dissonans?",
    options: [
      "Når forbrukeren opplever motstridende tanker etter et kjøp",
      "En prosess der hjernen ignorerer reklame",
      "Når en merkevare skaper følelser hos forbrukeren",
      "En kjøpsprosess med høy risiko",
    ],
    correct: 0,
    explanation: "Kognitiv dissonans oppstår når en forbruker opplever ubehagelige motstridende tanker etter et kjøp."
  },
];

const Quiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === questions[currentQuestion].correct) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentQuestion(currentQuestion + 1);
  };

  return (
    <div className="flex flex-col items-center p-5">
      {currentQuestion < questions.length ? (
        <div className="w-96 p-5 text-center bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-bold">{questions[currentQuestion].question}</h2>
          <div className="mt-4">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`mt-2 w-full p-2 ${selectedAnswer !== null && (index === questions[currentQuestion].correct ? "bg-green-500" : index === selectedAnswer ? "bg-red-500" : "bg-gray-200")}`}
                disabled={selectedAnswer !== null}
              >
                {option}
              </button>
            ))}
          </div>
          {showExplanation && (
            <div className="mt-4 text-sm text-gray-700">
              <p>{questions[currentQuestion].explanation}</p>
              <button className="mt-3 p-2 bg-blue-500 text-white rounded" onClick={nextQuestion}>Neste spørsmål</button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-96 p-5 text-center bg-white shadow-lg rounded-lg">
          <h2 className="text-xl font-bold">Quiz fullført!</h2>
          <p className="mt-3">Du fikk {score} av {questions.length} riktige!</p>
        </div>
      )}
    </div>
  );
};

export default Quiz;