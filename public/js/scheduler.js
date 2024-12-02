// const mongoose = require('mongoose');
// const AcademicYear = require('../../models/academicYear'); // Adjust path as needed
// const Section = require('../../models/section'); // Adjust path as needed
// const schedule = require('node-schedule');

// // Function to update current semesters for all sections
// async function updateCurrentSemester() {
//   try {
//     // Fetch all sections with their associated academic year
//     const sections = await Section.find({}).populate('year').exec();

//     // Get the current date
//     const currentDate = new Date();

//     for (const section of sections) {
//       const academicYear = section.year;
//       if (!academicYear || !academicYear.semesters || academicYear.semesters.length === 0) {
//         console.log(`No academic year or semesters found for section: ${section.name}`);
//         continue;
//       }

//       // Find the current semester based on today's date
//       const currentSemester = academicYear.semesters.find(semester => {
//         return currentDate >= semester.startDate && currentDate <= semester.endDate;
//       });

//       if (currentSemester) {
//         // Update the section's current semester if it's different
//         if (!section.currentSemester || !section.currentSemester.equals(currentSemester.sem)) {
//           section.currentSemester = currentSemester.sem;
//           await section.save();
//           console.log(`Updated current semester for section: ${section.name}`);
//         }
//       } else {
//         console.log(`No valid semester found for section: ${section.name}`);
//       }
//     }
//   } catch (error) {
//     console.error("Error updating current semesters:", error);
//   }
// }

// // Schedule the task to run at midnight every day
// schedule.scheduleJob('0 0 * * *', () => {
//   updateCurrentSemester();
//   console.log("Running daily semester update...");
// });
