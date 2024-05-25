// const attendanceData = [];

// // Loop through students and create attendance objects
// for (const student of students) {
//   const status = document.getElementById(`student-${student._id}`).value; // Get selected status
//   console.log(student._id);
//   attendanceData.push({ studentId: student._id, status: status });
// }

// // Convert array to JSON string and set the hidden input value
// document.getElementById('attendanceData').value = JSON.stringify(attendanceData);
// console.log(attendanceData);
// // Submit the form
// document.querySelector('form').submit();

const attendanceData = students.map(student => ({
    studentId: student._id,
    status: document.getElementById(`student-${student._id}`).value,
  }));
  console.log(student._id);
  