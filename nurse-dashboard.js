const BASE_URL = 'https://workflows.aphelionxinnovations.com';
const TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJndWlkIjoiZmJmMmI1ZjctZTc3ZS00ZGZmLWJlN2UtN2ZlOGVkZmViZmY1IiwiZmlyc3ROYW1lIjoiTW91c3NhIiwibGFzdE5hbWUiOiJTYWlkaSIsInVzZXJuYW1lIjoic2FpZGkiLCJlbWFpbCI6Im1vdXNzYS5zYWlkaS4wMUBnbXppbC5jb20iLCJwYXNzd29yZCI6ImFkbWluMTIzNCIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc0Mjk1MjMyNn0.1s_IWO-h-AKwkP0LIX8mcjdeLRwsRtgbqAchIJSRVEA'; // remplace avec ton vrai token

let currentIPP = null;
let mediaRecorder;
let audioChunks = [];

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentIPP = urlParams.get('ipp');
  if (currentIPP) {
    loadPatient(currentIPP);
  } else {
    document.getElementById("patientInfo").innerHTML = "<p style='color:red;'>❌ IPP non trouvé dans l'URL.</p>";
  }
};

// ✅ Chargement des infos du patient
function loadPatient(ipp) {
  fetch(`${BASE_URL}/webhook/nurse-get-patient?ipp=${ipp}`, {
    headers: { Authorization: TOKEN }
  })
    .then(res => res.json())
    .then(data => {
      if (!data || !data.nom) {
        document.getElementById("patientInfo").innerHTML = "<p>❌ Patient non trouvé.</p>";
        return;
      }

      document.getElementById("patientInfo").innerHTML = `
        <strong>Nom:</strong> ${data.prenom} ${data.nom}<br>
        <strong>IPP:</strong> ${data.ipp}<br>
        <strong>CIN:</strong> ${data.cin}<br>
        <strong>Téléphone:</strong> ${data.telephone}<br>
        <strong>Adresse:</strong> ${data.adresse}<br>
        <strong>Mutuelle:</strong> ${data.mutuelle || 'Aucune'}
      `;
    })
    .catch(err => {
      document.getElementById("patientInfo").innerHTML = "<p>❌ Erreur lors du chargement des données.</p>";
      console.error(err);
    });
}

// ✅ Démarrer l'enregistrement
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

// ✅ Arrêter l'enregistrement
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    document.getElementById("startObservationBtn").disabled = false;
  }
}

// ✅ Envoi du fichier audio à l'IA pour transcription
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

// ✅ Envoi de l'observation
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
