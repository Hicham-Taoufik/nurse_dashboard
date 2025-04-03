
const BASE_URL = "https://workflows.aphelionxinnovations.com";
const TOKEN = "Bearer eyJhbGciOiJIUzI1NiIs..."; // Replace with real token

let mediaRecorder;
let audioChunks = [];

function fetchPatient() {
  const ipp = document.getElementById("ippInput").value.trim();
  if (!ipp) return alert("Veuillez entrer un IPP.");

  fetch(`${BASE_URL}/webhook/nurse-get-patient?ipp=${ipp}`, {
    headers: { Authorization: TOKEN }
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("patientInfo").innerHTML = `
        <strong>Nom:</strong> ${data.nom} ${data.prenom}<br>
        <strong>CIN:</strong> ${data.cin}<br>
        <strong>Téléphone:</strong> ${data.telephone}<br>
        <strong>Adresse:</strong> ${data.adresse}<br>
        <strong>Mutuelle:</strong> ${data.mutuelle || 'Aucune'}
      `;
    });
}

function startRecording() {
  audioChunks = [];
  document.getElementById("transcriptionStatus").innerText = "🎙️ Enregistrement...";

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
  });
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append("audio", blob, "observation.webm");

      fetch(`${BASE_URL}/webhook/nurse-transcribe-observation`, {
        method: "POST",
        headers: { Authorization: TOKEN },
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          const text = Array.isArray(data) ? data[0]?.transcript || data[0]?.text : data?.transcript || data?.text;
          document.getElementById("observationInput").value = text;
          document.getElementById("transcriptionStatus").innerText = "✅ Transcription terminée.";
        })
        .catch(() => {
          document.getElementById("transcriptionStatus").innerText = "❌ Erreur de transcription.";
        });
    };
  }
}

function submitObservation() {
  const ipp = document.getElementById("ippInput").value.trim();
  const observation = document.getElementById("observationInput").value.trim();

  if (!ipp || !observation) {
    return alert("Veuillez remplir l'IPP et l'observation.");
  }

  fetch(`${BASE_URL}/webhook/nurse-submit-observation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN
    },
    body: JSON.stringify({ ipp, observation })
  })
    .then(() => {
      document.getElementById("submissionMessage").innerText = "✅ Observation soumise avec succès.";
    })
    .catch(() => {
      document.getElementById("submissionMessage").innerText = "❌ Échec de l'envoi.";
    });
}
