let students = [
{name:"Ram", marks:85, course:"CSE"},
{name:"Kishore", marks:70, course:"ECE"},
{name:"Ramya", marks:92, course:"CSE"},
{name:"Sneha", marks:78, course:"EEE"},
{name:"Akhil", marks:88, course:"CSE"}
];

// Display table
function displayTable(data){

let table = document.getElementById("tableBody");
table.innerHTML="";

data.forEach(s=>{

let row = `
<tr>
<td>${s.name}</td>
<td>${s.marks}</td>
<td>${s.course}</td>
</tr>
`;

table.innerHTML += row;

});
}

// Print all names
function printNames(){
displayTable(students);
}

// Marks > 80
function marksAbove80(){
let result = students.filter(s => s.marks > 80);
displayTable(result);
}

// Count students in each course
function countCourses(){

let count = {};

students.forEach(s=>{
count[s.course] = (count[s.course] || 0) + 1;
});

let text="";

for(let course in count){
text += course + " : " + count[course] + "<br>";
}

document.getElementById("result").innerHTML=text;
}

// Show only CSE students
function showCSE(){
let result = students.filter(s => s.course === "CSE");
displayTable(result);
}

// Convert names to uppercase
function upperCase(){

let result = students.map(s => ({
name:s.name.toUpperCase(),
marks:s.marks,
course:s.course
}));

displayTable(result);
}


// Market Products (some & reduce)

let products = [
{name:"Laptop", price:60000},
{name:"Phone", price:20000},
{name:"Tablet", price:27000},
{name:"TV", price:60000}
];

// some()
function checkExpensive(){

let expensive = products.some(p => p.price > 50000);

document.getElementById("result").innerHTML =
expensive ? "There is an expensive product" : "No expensive product";

}

// reduce()
function totalPrice(){

let total = products.reduce((sum,p)=> sum + p.price,0);

document.getElementById("result").innerHTML =
"Total price = " + total;

}