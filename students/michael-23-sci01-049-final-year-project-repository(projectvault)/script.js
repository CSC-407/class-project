// ==========================================
// PROJECTVAULT - MAIN JAVASCRIPT
// ==========================================

// 1. SAMPLE PROJECT DATA
// These are fictional examples for demonstration.

const projects = [
    {
        id: 1,
        title: "Design and Implementation of a Student Attendance Management System",
        department: "Computer Science",
        year: "2026",
        supervisor: "Dr. A. Johnson",
        technologies: "HTML, CSS, JavaScript, PHP, MySQL",
        abstract: "This project focuses on developing a digital system for recording and managing student attendance. It aims to reduce manual record keeping, improve accuracy, and make attendance information easier to access."
    },
    {
        id: 2,
        title: "Development of an Online Hospital Management System",
        department: "Computer Science",
        year: "2025",
        supervisor: "Dr. B. Williams",
        technologies: "HTML, CSS, JavaScript, Python",
        abstract: "This project presents a web-based hospital management system designed to organise patient records, appointments, and basic administrative activities."
    },
    {
        id: 3,
        title: "A Web-Based Library Management System",
        department: "Information Technology",
        year: "2026",
        supervisor: "Mr. C. Adeyemi",
        technologies: "HTML, CSS, JavaScript, MySQL",
        abstract: "The project explores how a web-based application can support library operations, including book registration, searching, borrowing records, and returns."
    },
    {
        id: 4,
        title: "Development of a Campus Navigation Application",
        department: "Software Engineering",
        year: "2025",
        supervisor: "Mrs. D. Okafor",
        technologies: "JavaScript, React, CSS",
        abstract: "This project proposes a digital navigation application that helps users identify important locations within a university campus."
    },
    {
        id: 5,
        title: "Design of an Automated Energy Monitoring System",
        department: "Electrical Engineering",
        year: "2024",
        supervisor: "Engr. E. Bello",
        technologies: "Arduino, C++, Sensors",
        abstract: "This project investigates a system for monitoring electrical energy consumption and presenting usage information to support better energy management."
    },
    {
        id: 6,
        title: "The Influence of Social Media on University Students",
        department: "Mass Communication",
        year: "2025",
        supervisor: "Dr. F. Ibrahim",
        technologies: "Survey Research, Statistical Analysis",
        abstract: "This study examines how social media platforms influence communication habits, information consumption, and interactions among university students."
    },
    {
        id: 7,
        title: "Development of an E-Learning Management Platform",
        department: "Computer Science",
        year: "2024",
        supervisor: "Dr. G. Musa",
        technologies: "HTML, CSS, JavaScript, Python",
        abstract: "This project explores the design of an online learning platform where students can access learning materials, view course information, and engage with educational resources."
    },
    {
        id: 8,
        title: "Design and Implementation of a Student Result Processing System",
        department: "Information Technology",
        year: "2026",
        supervisor: "Mr. H. James",
        technologies: "PHP, MySQL, HTML, CSS",
        abstract: "This project proposes a computerised result processing system intended to support the organisation, calculation, and retrieval of student academic results."
    }
];


// 2. SELECT IMPORTANT HTML ELEMENTS

const projectGrid = document.getElementById("project-grid");
const searchInput = document.getElementById("search-input");
const departmentFilter = document.getElementById("department-filter");
const yearFilter = document.getElementById("year-filter");
const noResults = document.getElementById("no-results");


// 3. DISPLAY PROJECTS ON THE WEBSITE

function displayProjects(projectList) {
    projectGrid.innerHTML = "";

    projectList.forEach((project) => {
        const projectCard = document.createElement("article");
        projectCard.className = "project-card";

        projectCard.innerHTML = `
            <div class="project-card-top">
                <div class="project-card-icon">📚</div>
                <span>${project.year}</span>
            </div>

            <div class="project-card-body">
                <p class="project-department">${project.department}</p>

                <h3>${project.title}</h3>

                <div class="project-meta">
                    <span>🎓 Academic Project</span>
                </div>

                <button class="view-project" type="button">
                    View Project Details →
                </button>
            </div>
        `;

        const viewButton = projectCard.querySelector(".view-project");

        viewButton.addEventListener("click", () => {
            showProjectDetails(project);
        });

        projectGrid.appendChild(projectCard);
    });

    // Display a message if no projects match the search.
    noResults.hidden = projectList.length !== 0;
}


// 4. SEARCH AND FILTER PROJECTS

function filterProjects() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedDepartment = departmentFilter.value;
    const selectedYear = yearFilter.value;

    const filteredProjects = projects.filter((project) => {
        const matchesSearch =
            project.title.toLowerCase().includes(searchTerm) ||
            project.department.toLowerCase().includes(searchTerm) ||
            project.technologies.toLowerCase().includes(searchTerm) ||
            project.abstract.toLowerCase().includes(searchTerm);

        const matchesDepartment =
            selectedDepartment === "" ||
            project.department === selectedDepartment;

        const matchesYear =
            selectedYear === "" ||
            project.year === selectedYear;

        return matchesSearch && matchesDepartment && matchesYear;
    });

    displayProjects(filteredProjects);
}


// Listen for changes in the search and filter fields.

searchInput.addEventListener("input", filterProjects);
departmentFilter.addEventListener("change", filterProjects);
yearFilter.addEventListener("change", filterProjects);


// 5. PROJECT DETAILS POP-UP

function showProjectDetails(project) {
    // Create the pop-up the first time it is needed.
    let modal = document.getElementById("project-modal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "project-modal";
        modal.className = "project-modal";

        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" role="dialog" aria-modal="true"
             aria-labelledby="modal-title">

            <button class="modal-close" type="button"
                    aria-label="Close project details">&times;</button>

            <p class="project-department">${project.department}</p>

            <h2 id="modal-title">${project.title}</h2>

            <div class="modal-details">
                <p><strong>Academic Year:</strong> ${project.year}</p>
                <p><strong>Supervisor:</strong> ${project.supervisor}</p>
                <p><strong>Technologies:</strong> ${project.technologies}</p>

                <h3>Project Abstract</h3>
                <p>${project.abstract}</p>
            </div>

            <p class="modal-note">
                Demonstration project information. This is not a downloadable
                research document.
            </p>
        </div>
    `;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    const closeButton = modal.querySelector(".modal-close");

    closeButton.addEventListener("click", closeProjectDetails);

    // Close the pop-up when the user clicks outside its content.
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeProjectDetails();
        }
    });
}


// Function for closing the project details pop-up.

function closeProjectDetails() {
    const modal = document.getElementById("project-modal");

    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}


// Allow the Escape key to close the pop-up.

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeProjectDetails();
    }
});


// 6. DEPARTMENT BUTTONS

const departmentCards = document.querySelectorAll(".department-card");

departmentCards.forEach((card) => {
    card.addEventListener("click", () => {
        const department = card.dataset.department;

        departmentFilter.value = department;

        filterProjects();

        document.getElementById("projects").scrollIntoView({
            behavior: "smooth"
        });
    });
});


// 7. MOBILE NAVIGATION MENU

const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("show");

    menuToggle.setAttribute("aria-expanded", isOpen);
    menuToggle.textContent = isOpen ? "✕" : "☰";
});


// Close the mobile menu when a navigation link is clicked.

navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("show");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "☰";
    });
});


// 8. PROJECT SUBMISSION FORM

const projectForm = document.getElementById("project-form");
const formMessage = document.getElementById("form-message");

projectForm.addEventListener("submit", (event) => {
    // Stop the browser from refreshing the page.
    event.preventDefault();

    // Check whether all required fields are filled.
    if (!projectForm.checkValidity()) {
        projectForm.reportValidity();
        return;
    }

    // Display a demonstration success message.
    formMessage.textContent =
        "Thank you! Your project submission has been received for this demonstration.";

    formMessage.style.color = "#15803D";
    formMessage.style.display = "block";

    // Clear the form fields.
    projectForm.reset();

    // Bring the success message into view.
    formMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});


// 9. DISPLAY ALL PROJECTS WHEN THE PAGE LOADS

displayProjects(projects);