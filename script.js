// Project Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('projectModal');
    const modalClose = document.querySelector('.modal-close');
    const projectCards = document.querySelectorAll('.project-card-btn');

    // Open modal when project card is clicked
    projectCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(card);
        });

        // Support keyboard navigation
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(card);
            }
        });
    });

function openModal(card) {
    const title = card.dataset.projectTitle;
    const image = card.dataset.projectImage;
    const description = card.dataset.projectDescription;
    const techs = card.dataset.projectTechs.split(',').map(tech => tech.trim());
    const repoUrl = card.dataset.projectRepo;
    const isPublication = card.dataset.projectIsPublication === 'true';
    const isPublished = card.dataset.projectPublished === 'true';
    const publicationUrl = card.dataset.projectPublicationUrl;

    // Set modal content
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalImage').src = image;
    document.getElementById('modalImage').alt = title;
    document.getElementById('modalDescription').textContent = description;
    document.getElementById('modalRepoBtn').href = repoUrl;

    // Handle publication button
    const publicationBtn = document.getElementById('modalPublicationBtn');
    if (isPublication) {
        publicationBtn.style.display = 'block';
        if (isPublished && publicationUrl) {
            publicationBtn.href = publicationUrl;
            publicationBtn.classList.remove('disabled');
            publicationBtn.textContent = 'View Publication';
            publicationBtn.onclick = null;
        } else {
            publicationBtn.href = '#';
            publicationBtn.classList.add('disabled');
            publicationBtn.textContent = 'View Publication';
            publicationBtn.onclick = (e) => e.preventDefault();
            
            // Handle hover text change for disabled state
            publicationBtn.onmouseenter = function() {
                this.textContent = 'In Progress';
            };
            publicationBtn.onmouseleave = function() {
                this.textContent = 'View Publication';
            };
        }
    } else {
        publicationBtn.style.display = 'none';
    }

    // Clear and populate tech boxes
    const techBoxesContainer = document.getElementById('techBoxes');
    techBoxesContainer.innerHTML = '';
    techs.forEach(tech => {
        const techBox = document.createElement('div');
        techBox.className = 'tech-box';
        techBox.textContent = tech;
        techBoxesContainer.appendChild(techBox);
    });

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when close button is clicked
modalClose.addEventListener('click', closeModal);

// Close modal when clicking outside the modal content
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
});
