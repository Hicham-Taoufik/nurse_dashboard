const BASE_URL = 'https://workflows.aphelionxinnovations.com';
const TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJndWlkIjoiZmJmMmI1ZjctZTc3ZS00ZGZmLWJlN2UtN2ZlOGVkZmViZmY1IiwiZmlyc3ROYW1lIjoiTW91c3NhIiwibGFzdE5hbWUiOiJTYWlkaSIsInVzZXJuYW1lIjoic2FpZGkiLCJlbWFpbCI6Im1vdXNzYS5zYWlkaS4wMUBnbXppbC5jb20iLCJwYXNzd29yZCI6ImFkbWluMTIzNCIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc0Mjk1MjMyNn0.1s_IWO-h-AKwkP0LIX8mcjdeLRwsRtgbqAchIJSRVEA';

let currentIPP = null;
let mediaRecorder;
let audioChunks = [];

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentIPP = urlParams.get('ipp');
  if (currentIPP) {
    loadPatient(currentIPP);
  } else {
    document.getElementById("patientInfo").innerHTML = "<p class='error'>❌ IPP non trouvé dans l'URL.</p>";
  }
};

function loadPatient(ipp) {
  fetch(`${BASE_URL}/webhook/nurse-get-patient?ipp=${ipp}`, {
    headers: { Authorization: TOKEN }
  })
    .then(res => res.json())
    .then(data => {
      if (!data || !data.nom) {
        document.getElementById("patientInfo").innerHTML = "<p class='error'>❌ Patient non trouvé.</p>";
        return;
      }

      document.getElementById("patientInfo").innerHTML = `
        <div><strong>Nom:</strong> ${data.prenom} ${data.nom}</div>
        <div><strong>IPP:</strong> ${data.ipp}</div>
        <div><strong>CIN:</strong> ${data.cin}</div>
        <div><strong>Téléphone:</strong> ${data.telephone}</div>
        <div><strong>Adresse:</strong> ${data.adresse}</div>
        <div><strong>Mutuelle:</strong> ${data.mutuelle || 'Aucune'}</div>
      `;
    })
    .catch(err => {
      document.getElementById("patientInfo").innerHTML = "<p class='error'>❌ Erreur lors du chargement des données.</p>";
      console.error(err);
    });
}

function startRecording() {
  audioChunks = [];
  document.getElementById("observationStatus").innerText = "🎤 Enregistrement...";

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      sendAudioToAI(blob);
      document.getElementById("observationStatus").innerText = "⏳ Transcription en cours...";
    };

    document.getElementById("startObservationBtn").disabled = true;
  }).catch(err => {
    alert("Erreur microphone: " + err.message);
  });
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    document.getElementById("startObservationBtn").disabled = false;
  }
}

function sendAudioToAI(blob) {
  const formData = new FormData();
  formData.append("audio", blob, "observation.webm");

  fetch(`${BASE_URL}/webhook/nurse-transcribe-observation`, {
    method: "POST",
    headers: { Authorization: TOKEN },
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      const text = Array.isArray(data)
        ? data[0]?.transcript || data[0]?.text || ''
        : data?.transcript || data?.text || '';

      if (!text) {
        document.getElementById("observationStatus").innerText = "⚠️ Transcription vide.";
        return;
      }

      document.getElementById("observationInput").value = text;
      document.getElementById("observationStatus").innerText = "✅ Transcription terminée.";
    })
    .catch(err => {
      console.error("Erreur transcription:", err);
      document.getElementById("observationStatus").innerText = "❌ Erreur de transcription.";
    });
}

function submitObservation() {
  const observation = document.getElementById("observationInput").value.trim();
  if (!observation) {
    alert("Veuillez entrer une observation.");
    return;
  }

  fetch(`${BASE_URL}/webhook/nurse-submit-observation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: TOKEN
    },
    body: JSON.stringify({ ipp: currentIPP, observation })
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById("obsMessage").innerText = "✅ Observation enregistrée avec succès.";
    })
    .catch(err => {
      console.error("Erreur enregistrement observation:", err);
      document.getElementById("obsMessage").innerText = "❌ Erreur lors de l'enregistrement.";
    });
}
