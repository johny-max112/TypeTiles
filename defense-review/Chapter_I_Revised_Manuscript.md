# CHAPTER I

# INTRODUCTION

## Background and Rationale of the Study

Typing is an essential digital skill required in academic, communication, and professional settings. In today’s digital era, information technology has significantly shaped how people study, work, and interact. Many tasks such as writing documents, conducting research, programming, and online communication rely on efficient computer use. The ability to type quickly and accurately improves productivity, minimizes errors, and allows users to complete tasks more effectively.

Despite its importance, many students and beginners still experience low typing speed and accuracy due to limited practice and lack of effective training tools. Traditional typing tutor applications often rely on repetitive exercises, which may lead to boredom and reduced motivation among users. As a result, learners may not practice consistently, which negatively affects their ability to improve their typing skills.

Game-based learning has been introduced as an alternative approach to address these challenges. By incorporating interactive elements such as scoring systems, time-based tasks, and selectable difficulty levels, gamification can encourage user motivation and continuous practice. The related literature reviewed in this study provides the basis for examining how interactive learning activities may support engagement and typing skill development.

The proposed system, Type Tiles, is a browser-based typing application that utilizes a falling tile mechanic. In this setup, words, sentences, or Gregg shorthand images fall from the top of the gameplay area, and users are required to type the corresponding text correctly before the target reaches the bottom. This approach is designed to support typing speed and accuracy through continuous and time-pressured interaction.

In addition, users may encounter unstable or limited internet connectivity when accessing educational applications. Type Tiles supports a hosted implementation for online access and a locally served implementation for use on a computer or within a Local Area Network (LAN). Local operation requires the frontend, backend, and local database to be available, while the hosted implementation requires a connection to the deployed services. Registration and email verification also depend on access to the email delivery service. This study supports Sustainable Development Goal 4 (Quality Education) by promoting learning tools that support digital literacy and aligns with Sustainable Development Goal 9 (Industry, Innovation, and Infrastructure) by utilizing technology for skill development.

The researchers propose the development of Type Tiles: A Gamified Standalone Typing Application Using Falling Tile Mechanics for Skill Development to address the challenges associated with traditional typing practice methods. Many existing typing applications rely on repetitive activities that may reduce user motivation and consistency in practice. This study aims to provide a more interactive alternative through the integration of game-based elements and classroom participation.

The use of falling tile mechanics creates a time-pressured environment that encourages users to respond quickly and accurately during typing activities. Features such as scoring systems, difficulty levels, life mechanics, and performance feedback are intended to maintain user interest and promote continuous practice. Teacher-hosted multiplayer sessions and saved classroom records also provide opportunities for instructors to review student performance. This study is conducted to provide a practical tool for typing practice while supporting learners in developing digital skills for academic and future professional use.

## General Objective

The main objective of this study is to design and develop Type Tiles, a gamified typing application that supports typing speed and accuracy development through falling tile mechanics, selectable difficulty levels, and individual and teacher-hosted classroom activities.

## Specific Objectives:

1. To design a browser-based graphical user interface that supports falling tile typing gameplay, role-based navigation, and multiplayer lobby access.
2. To develop a typing system with difficulty levels, scoring, and life/health mechanics where users input the required text before falling targets reach the bottom of the gameplay area.
3. To develop a multiplayer room code system that allows an instructor to create a classroom session, enabling up to fifty students to join a shared lobby and participate in real-time typing activities, with the instructor serving as a separate host.
4. To implement real-time performance metrics, including Words Per Minute, accuracy rate, and error rate, and provide saved results and teacher-specific student performance records for review.
5. To evaluate the system based on usability, functionality, and its suitability for supporting typing practice and classroom engagement.

## Significance of the Study

This study introduces Type Tiles, a gamified typing application designed to support user proficiency through falling tile mechanics, real-time feedback, and selectable difficulty levels. By providing an interactive platform for typing practice and classroom activities, this research offers potential benefits to the following:

**Students.** The system may help students develop their typing speed, accuracy, and keyboard familiarity through regular practice supported by interactive play. Through individual activities and teacher-hosted classroom sessions, students can review their results and identify areas that require further practice. These skills are relevant to academic tasks and the use of digital technologies.

**Instructors.** The application may serve as an educational and interactive platform for instructors, allowing them to create classroom codes, configure multiplayer activities, and monitor participating students. During classroom matches, the instructor serves as the host and reviews live student rankings. Through session results and teacher-specific student progress records, instructors can examine saved performance across their own classroom activities and support students in developing typing and computer literacy skills. Instructors may also use Solo Practice separately.

**General Public.** The system provides a typing platform that can be accessed through the hosted website or a properly configured local implementation. Users may practice independently through supported categories and difficulty levels. Access to the hosted version requires internet connectivity, while local use depends on the availability of the configured frontend, backend, and local database services.

**Institution.** The research supports the institution’s efforts to integrate technology into teaching and learning and to promote digital literacy and skills-based education. Through classroom activities and recorded performance feedback, the institution may use the application as a supplementary tool in computer education and typing-related courses.

**Developers.** The project may provide insights into the development of interactive, gamified learning applications, particularly those involving real-time gameplay, role-based access, classroom coordination, and performance reporting. It can guide developers in designing systems that support user participation and the review of recorded performance.

**Future Researchers.** This study may serve as a reference for researchers interested in gamification, typing education, and human–computer interaction. Future projects may build upon the system’s concepts, mechanics, or design approaches to develop more advanced or specialized learning tools and investigate their educational outcomes.

## Scope of the Study

- This study focuses on the design and development of Type Tiles: A Gamified Standalone Typing Application Using Falling Tile Mechanics for Skill Development, implemented as a browser-based application intended to support typing speed and accuracy through interactive practice.
- The system provides a structured environment where users can practice typing under time pressure through falling targets, selectable difficulty levels, scoring, and life/health mechanics. Supported content includes Word / Phrase and Full Sentence activities for applicable categories, while Gregg stenography uses supplied shorthand images and corresponding English answers.
- The application includes real-time performance feedback through Words Per Minute, accuracy rate, and error rate. It also provides gameplay results, personal history, teacher-owned classroom reports, and teacher-specific student progress based on saved classroom participation records.
- The system supports Solo Practice and teacher-hosted multiplayer classrooms through online or properly configured local network connections. Each classroom supports up to fifty student participants, with one teacher serving as a separate host. The teacher selects the classroom configuration and monitors student performance, while students join through the shared room code.
- Student and Teacher accounts can be registered through the shared authentication interface and must complete email verification before logging in. Access to classroom hosting, student participation, teacher reports, and administrative functions is controlled according to the account’s current role and applicable ownership permissions.
- The hosted implementation uses PostgreSQL for persistent data storage, while the local implementation can use SQLite. These database providers are selected according to the backend configuration and do not automatically synchronize records with one another.
- The system targets students, beginner typists, office workers, and educational institutions such as schools and computer laboratories. The study particularly considers the relevance of typing practice and related content to Bachelor of Science in Office Administration students and their instructors.
- The study includes planning, designing, developing, and evaluating the system to examine its functionality and suitability as a typing practice tool. The application is intended to support consistent practice and the review of performance information for academic and professional skill development.

## Limitation of the Study

- The current implementation runs through a supported web browser and the corresponding backend service. A packaged desktop application and a native mobile application are not included in the current implementation.
- Online access requires connectivity to the deployed frontend and backend. Local use requires the application services and SQLite database to be configured and running. Registration, email verification, and password recovery require access to the email delivery service.
- The classroom limit applies to fifty student participants and one teacher host per room. This limit does not establish the total number of users that the deployed system can support across multiple simultaneous classrooms; such capacity depends on the hosting environment and further performance evaluation.
- Live room codes, readiness information, and classroom connection state are maintained in backend memory. Saved match and participant records may remain in persistent storage, but automatic restoration of an active classroom after a backend restart and exact continuation of gameplay after a page refresh are not provided.
- The local and hosted databases are separate storage options. Automatic data synchronization, account transfer, and offline-to-online record merging are not included.
- Gregg stenography gameplay depends on supplied image assets and predefined answers. Full-sentence shorthand exercises are available, while individual cropped word/phrase mappings remain subject to verification and are restricted to development preview. The system does not automatically recognize or translate unfamiliar shorthand images.
- Gameplay scores, Words Per Minute, and accuracy originate from the client gameplay engine. The backend validates submitted values, enforces access permissions, and determines classroom rankings; independent reconstruction of every typing event for comprehensive anti-cheat verification is not included.
- The system records typing performance metrics but does not separately measure reaction time or hand-eye coordination as stored assessment results. Improvements in typing ability or engagement require appropriate evaluation evidence beyond the presence of gameplay features.
- The system’s performance depends on factors such as computer hardware, keyboard responsiveness, display quality, network conditions, and hosting resources. Delays or technical issues may affect the overall user experience.

## Conceptual Framework

*Figure 1: Conceptual Framework*

The conceptual framework of this study illustrates the interaction among the key components involved in the development and implementation of Type Tiles, a gamified typing application that utilizes falling tile mechanics to support typing practice. The framework demonstrates how development requirements and user inputs are processed through system operations to produce gameplay feedback, performance records, and information for reviewing user participation.

This study is anchored on the principles of Gamification and Human–Computer Interaction (HCI). Gamification introduces elements such as scoring systems, challenges, immediate feedback, and competition to encourage user participation during the learning process. HCI focuses on designing an interactive and user-friendly system that enables users to navigate the application and respond to gameplay activities through a clear and responsive interface.

The proposed system follows the Input–Process–Output (IPO) Model, which provides a structured representation of how the system operates. This model illustrates how the requirements and user inputs are transformed through development activities and application processes into outputs that describe gameplay performance and support the evaluation of the system.

The input phase consists of the resources, tools, and requirements necessary for the development and implementation of the system:

1. Software Requirements – Includes Visual Studio Code, TypeScript, React, Vite, Phaser 3, Node.js, Express, PostgreSQL, and SQLite, which support coding, interface development, game rendering, server operations, and data management. These components are used according to their respective roles in the hosted and local implementations.
2. Hardware Requirements – Includes a desktop computer or laptop, keyboard, mouse, and monitor required to develop, test, and operate the application. Network access and a configured host are also required when conducting multiplayer classroom activities across devices.
3. Knowledge Requirements – Includes programming skills, database management knowledge, HTML, CSS, TypeScript, React, Node.js, game development concepts, network communication, and UI/UX design principles necessary for building and maintaining the system.

The process phase represents the development methodology and system operations used to transform inputs into the application and its outputs:

1. Requirements Analysis – The system requirements, objectives, gameplay features, user roles, classroom activities, and functional specifications are identified and analyzed.
2. System Design – The user interface, gameplay flow, database relationships, classroom communication, and overall architecture of the application are planned and designed.
3. Development Phase – The application is developed using React and TypeScript for the interface, Phaser 3 for gameplay, Node.js and Express for backend operations, WebSocket communication for classroom coordination, and PostgreSQL or SQLite for persistent storage.
4. Testing Phase – The system is examined to identify defects, validate functionality, and assess the behavior of authentication, gameplay, classroom access, result persistence, and reporting. The reported findings should reflect the tests and evaluation activities actually conducted.
5. Review and Improvement – Feedback, identified defects, testing observations, and evaluation results are reviewed to refine system functionality, usability, and performance.
6. Deployment Phase – The application is built and configured for access through the hosted services or the appropriate local environment. Backend connections, database selection, and supported classroom endpoints are configured for the intended implementation.
7. Agile Development Methodology – The system follows an iterative approach that supports planning, development, testing, feedback, and incremental revisions throughout the project lifecycle.

The output phase presents the information and application functions produced after processing:

1. Typing Speed Feedback (Words Per Minute) – The application displays typing speed calculated from completed answer characters divided by five and the elapsed gameplay time in minutes.
2. Accuracy and Error Feedback – The application displays the percentages of correct and incorrect keystroke attempts during the gameplay session, allowing users to review their input performance.
3. Completed Typing Activities – Individual and classroom activities provide opportunities to practice responding to falling words, sentences, and supplied shorthand prompts within the selected time and difficulty settings.
4. Performance Reports (Scores, Statistics, Rankings) – Saved records provide users with gameplay feedback and enable teachers to review student results and qualifying performance history within their own classrooms.
5. Information for System Evaluation – User feedback and recorded performance information may support the researchers’ examination of the application’s usability, functionality, and suitability for typing practice and classroom participation.

A feedback mechanism is incorporated through the presentation of gameplay results, personal history, classroom rankings, and teacher-specific student progress. Users and instructors can review the available performance information and select appropriate practice settings for subsequent activities. Feedback collected during development and evaluation may also guide revisions to the application. The current implementation uses manually selected difficulty levels and does not automatically adjust difficulty or personalize learning content based on past performance.

## Definition of Terms

To ensure clear and thorough understanding of the concepts discussed, the key terms below are defined based on their use and context within this study:

**Accuracy Rate** – The percentage of correct keystroke attempts relative to the total correct and incorrect keystroke attempts recorded during a gameplay session.

**Avatar Selection** – A feature that allows users to choose or customize the image associated with their profile.

**Difficulty Levels** – Gameplay settings, including Easy, Normal, and Hard, that determine falling speed and influence the selection of ordinary typing content.

**Error Rate** – The percentage of incorrect keystroke attempts relative to the total correct and incorrect keystroke attempts recorded during a gameplay session.

**Falling Tile Mechanics** – A gameplay feature in which a word, sentence, or shorthand image moves downward through the gameplay area. The user must type the required answer before the target reaches the bottom.

**Gamification** – A design approach that incorporates game elements such as scoring, challenges, competition, and performance feedback to encourage interaction and participation.

**Hand-Eye Coordination** – The ability to coordinate visual information on the screen with hand movements while typing. In this study, it describes an aspect of gameplay interaction rather than a separately recorded assessment metric.

**Life Bar / Health System** – A visual indicator of the user’s remaining chances during a round. A chance is lost when a falling target reaches the bottom of the gameplay area without being completed.

**Local Multiplayer** – A classroom activity in which students join a teacher-hosted room through devices connected to a configured local network and the same backend service.

**Performance Tracking** – A feature that stores and retrieves recorded gameplay results, including scores, typing speed, accuracy, and applicable classroom rankings.

**Reaction Time** – The interval between the appearance of a prompt and the user’s response. The application requires timely responses to falling targets but does not separately record reaction time as a performance result.

**Real-Time Input Validation** – A gameplay process that compares the user’s typed input with the expected answer while the activity is in progress.

**Room Code System** – A feature that generates a classroom identifier, allowing authenticated students to locate and join the teacher’s active room subject to role and capacity checks.

**Scoring System** – A feature that adds points for completing a target and deducts points for incorrect keystrokes and missed targets. The current gameplay awards ten points for a completed target, deducts two points for an incorrect keystroke, and deducts five points when a target reaches the bottom.

**Standalone Application** – The term retained in the approved project title. The current system operates through a browser and can be locally served with its backend and SQLite database; a packaged desktop application is outside the current implementation.

**Type Tiles** – The gamified typing application developed in this study, using falling tile mechanics, individual practice, teacher-hosted classrooms, and performance feedback to support typing skill development.

**Typing Speed (Words Per Minute / WPM)** – A performance measure calculated by dividing the number of characters in completed answers by five and then dividing the result by the elapsed gameplay time in minutes.

**User Authentication** – A security process that verifies account identity through username and password credentials after the required email verification has been completed.

**User Engagement** – The level of user interest, interaction, and participation while using the application. It is considered through the study’s evaluation activities rather than inferred solely from gameplay scores.
