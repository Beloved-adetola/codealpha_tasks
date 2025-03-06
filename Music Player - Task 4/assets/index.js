document.addEventListener("DOMContentLoaded", function () {
  // Query static elements
  const play = document.getElementById("play");
  const stop = document.getElementById("stop");
  const progress = document.getElementById("progress");
  const progressContainer = document.querySelector(".progress-container");
  const increment = document.getElementById("increment");
  const decrement = document.getElementById("decrement");
  const nextBtn = document.getElementById("next");
  const prevBtn = document.getElementById("prev");
  const shuffleBtn = document.getElementById("shuffle");
  const repeatBtn = document.getElementById("repeat");
  const fileInput = document.getElementById("fileInput");
  const nowPlaying = document.getElementById("nowPlaying");
  const musicList = document.querySelector(".music-list");

  let currentAudio = null;
  let currentIndex = -1;
  let isShuffle = false;
  let isRepeat = false; // For repeat at end of playlist

  // IndexedDB setup
  const dbName = "MusicDB";
  const storeName = "tracks";
  let db;

  const openRequest = indexedDB.open(dbName, 1);
  openRequest.onupgradeneeded = function (e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains(storeName)) {
      let store = db.createObjectStore(storeName, {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex("name", "name", { unique: false });
    }
  };

  openRequest.onsuccess = function (e) {
    db = e.target.result;
    loadStoredTracks();
  };

  openRequest.onerror = function (e) {
    console.error("Error opening IndexedDB", e);
  };

  // Load stored tracks from IndexedDB and add them to the music list
  function loadStoredTracks() {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = function () {
      const tracks = getAllRequest.result;
      tracks.forEach((track) => {
        const li = document.createElement("li");
        li.classList.add("music");
        li.setAttribute("data-id", track.id);
        li.innerHTML = `<i class='bx bxs-music' style='color:#0262a6'></i> ${
          track.name
        }
                        <audio src="${URL.createObjectURL(track.file)}"></audio>
                        <button class="delete-btn"><i class="bx bx-trash"></i></button>`;
        musicList.appendChild(li);
      });
      updateMusicItems();
      checkEmptyMusicList();
    };
    getAllRequest.onerror = function (e) {
      console.error("Error loading tracks", e);
    };
  }

  // Toggle shuffle mode
  shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("selected", isShuffle);
  });

  // Toggle repeat mode (repeat only when playlist ends)
  repeatBtn.addEventListener("click", () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle("selected", isRepeat);
  });

  // Helper to update click event listeners on all tracks
  function updateMusicItems() {
    const items = document.querySelectorAll(".music");
    items.forEach((item, index) => {
      item.onclick = () => playTrack(index);

      const deleteBtn = item.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = item.getAttribute("data-id");
          deleteTrack(id, item);
        });
      }
    });
    updateNavigationButtons();
  }

  // Check if the music list is empty. If so, display an upload prompt message.
  function checkEmptyMusicList() {
    if (musicList.children.length === 0) {
      // Create and insert the message if it doesn't exist
      if (!document.querySelector(".empty-message")) {
        let messageDiv = document.createElement("div");
        messageDiv.classList.add("empty-message");
        messageDiv.innerHTML =
          "No music available." +
          "<br>" +
          "Please upload a playlist to get started.";
        musicList.parentNode.insertBefore(messageDiv, musicList);
      }
      musicList.style.display = "none";
    } else {
      // Remove the message if the list is not empty
      let messageDiv = document.querySelector(".empty-message");
      if (messageDiv) messageDiv.remove();
      musicList.style.display = "block";
    }
  }

  // Delete a track from the list and IndexedDB
  // Delete track from IndexedDB and remove its element from the UI
  function deleteTrack(id, liElement) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const deleteRequest = store.delete(Number(id));
    deleteRequest.onsuccess = function () {
      liElement.remove();
      updateMusicItems();
      checkEmptyMusicList();
      const items = document.querySelectorAll(".music");
      // If no tracks remain, reset the player state
      if (items.length === 0) {
        if (currentAudio) {
          currentAudio.pause();
        }
        currentAudio = null;
        currentIndex = -1;
        play.innerHTML =
          "<i class='bx bx-play-circle' style='color:#fff; font-size: 30px;'></i>";
        nowPlaying.textContent = "Now Playing: None";
        progress.style.width = "0%";
        const elapsedElem = document.getElementById("elapsedTime");
        const remainingElem = document.getElementById("remainingTime");
        if (elapsedElem) elapsedElem.textContent = "0:00";
        if (remainingElem) remainingElem.textContent = "0:00";
      } else {
        // If the deleted track was the one currently playing, play the next available track.
        if (currentAudio && liElement.getAttribute("data-id") == id) {
          // Ensure currentIndex is in range
          if (currentIndex >= items.length) {
            currentIndex = 0;
          }
          playTrack(currentIndex);
        }
      }
    };
    deleteRequest.onerror = function (e) {
      console.error("Error deleting track", e);
    };
  }

  // Update next/prev button states based on currentIndex and playlist length
  function updateNavigationButtons() {
    const items = document.querySelectorAll(".music");
    if (!items || items.length === 0) return;
    if (currentIndex <= 0) {
      prevBtn.disabled = true;
      prevBtn.classList.add("disabled");
    } else {
      prevBtn.disabled = false;
      prevBtn.classList.remove("disabled");
    }
    if (currentIndex >= items.length - 1 && !isRepeat) {
      nextBtn.disabled = true;
      nextBtn.classList.add("disabled");
    } else {
      nextBtn.disabled = false;
      nextBtn.classList.remove("disabled");
    }
  }

  // Play a specific track by index
  function playTrack(index) {
    const items = document.querySelectorAll(".music");
    if (!items || items.length === 0) return;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentIndex = index;
    currentAudio = items[currentIndex].querySelector("audio");
    if (!currentAudio) {
      console.error("Audio element not found for track", index);
      return;
    }
    // Call play() and catch promise errors
    currentAudio.play().catch((error) => {
      if (error.name !== "AbortError") console.error(error);
    });
    play.innerHTML =
      "<i class='bx bx-pause-circle' style='color:#fff; font-size: 30px;'></i>";
    // Update Now Playing info (clone the element and remove its audio tag)
    const trackClone = items[currentIndex].cloneNode(true);
    const audioElem = trackClone.querySelector("audio");
    if (audioElem) trackClone.removeChild(audioElem);
    nowPlaying.textContent = "Now Playing: " + trackClone.textContent.trim();
    currentAudio.addEventListener("timeupdate", () =>
      updateProgressBar(currentAudio)
    );
    currentAudio.addEventListener("ended", nextTrack, { once: true });
    updateNavigationButtons();
  }

  // Next track function; if at end and repeat is on, loop back to first track
  function nextTrack() {
    const items = document.querySelectorAll(".music");
    if (items.length === 0) return;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      if (isRepeat) {
        playTrack(0);
      } else {
        currentAudio.currentTime = 0;
        play.innerHTML =
          "<i class='bx bx-play-circle' style='color:#fff; font-size: 30px;'></i>";
      }
    } else {
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * items.length);
      }
      playTrack(nextIndex);
    }
  }

  // Previous track function
  function prevTrack() {
    if (!currentAudio) return;
    if (currentAudio.currentTime > 5) {
      currentAudio.currentTime = 0;
    } else {
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = 0;
      playTrack(prevIndex);
    }
  }

  // Format time helper (M:SS)
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${minutes}:${sec < 10 ? "0" : ""}${sec}`;
  }

  // Update progress bar and time displays
  function updateProgressBar(audio) {
    if (!audio || !audio.duration) return;
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${progressPercent}%`;
    const elapsedElem = document.getElementById("elapsedTime");
    const remainingElem = document.getElementById("remainingTime");
    if (elapsedElem && remainingElem) {
      elapsedElem.textContent = formatTime(audio.currentTime);
      remainingElem.textContent = formatTime(
        audio.duration - audio.currentTime
      );
    }
  }

  // Play/Pause toggle
  play.addEventListener("click", () => {
    if (!currentAudio) {
      const items = document.querySelectorAll(".music");
      if (items.length > 0) {
        playTrack(0);
      }
    } else {
      if (currentAudio.paused) {
        currentAudio.play().catch((error) => {
          if (error.name !== "AbortError") console.error(error);
        });
        play.innerHTML =
          "<i class='bx bx-pause-circle' style='color:#fff; font-size: 30px;'></i>";
      } else {
        currentAudio.pause();
        play.innerHTML =
          "<i class='bx bx-play-circle' style='color:#fff; font-size: 30px;'></i>";
      }
    }
  });

  // Stop button
  stop.addEventListener("click", () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      play.innerHTML =
        "<i class='bx bx-play-circle' style='color:#fff; font-size: 30px;'></i>";
    }
  });

  // Skip forward 10 seconds
  increment.addEventListener("click", () => {
    if (currentAudio) {
      currentAudio.currentTime = Math.min(
        currentAudio.currentTime + 10,
        currentAudio.duration
      );
    }
  });

  // Skip backward 10 seconds
  decrement.addEventListener("click", () => {
    if (currentAudio) {
      currentAudio.currentTime = Math.max(currentAudio.currentTime - 10, 0);
    }
  });

  // Next/Previous buttons
  nextBtn.addEventListener("click", () => {
    nextTrack();
    updateNavigationButtons();
  });
  prevBtn.addEventListener("click", () => {
    prevTrack();
    updateNavigationButtons();
  });

  // Click on progress container to seek
  progressContainer.addEventListener("click", (e) => {
    if (!currentAudio || !currentAudio.duration) return;
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercentage = clickX / rect.width;
    currentAudio.currentTime = clickPercentage * currentAudio.duration;
    updateProgressBar(currentAudio);
  });

  // Handle file uploads and store them in IndexedDB
  fileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    // Show the music list if it was hidden due to no tracks
    musicList.style.display = "block";
    const emptyMessage = document.querySelector(".empty-message");
    if (emptyMessage) {
      emptyMessage.remove();
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      // Remove extension from file name
      const fileName = file.name.split(".").slice(0, -1).join(".");
      // Store the file in IndexedDB
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const data = { name: fileName, file: file };
      const addRequest = store.add(data);
      addRequest.onsuccess = function (e) {
        const id = e.target.result;
        // Add track to UI
        const li = document.createElement("li");
        li.classList.add("music");
        li.setAttribute("data-id", id);
        li.innerHTML = `<i class='bx bxs-music' style='color:#0262a6'></i> ${fileName}
                        <audio src="${url}"></audio>
                        <button class="delete-btn"><i class="bx bx-trash"></i></button>`;
        musicList.appendChild(li);
        updateMusicItems();
        checkEmptyMusicList();
      };
      addRequest.onerror = function (e) {
        console.error("Error storing file", e);
      };
    }
  });

  // Initial check if the music list is empty
  checkEmptyMusicList();
});
