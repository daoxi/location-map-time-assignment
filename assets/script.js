let map;
let marker;

// a handle for setTimeout() to be terminated by clearTimeout() in order to prevent multiple instances of setClock() running.
let clockIsOn;
// The default and initial time displayed to the user is the time on the client, after inputting a location, the time will become the local time at that location, this variable is used to change HTML DOM element to inform user about the change.
let clockInfo;

let latlngDisplay = document.getElementById("latlngDisplay");
let timeZoneInfo = document.getElementById("timeZoneInfo");

// Initialize and add the map
function initMap() {
	// The default location is at the CN Tower in Toronto
	const initPosition = { lat: 43.642567, lng: -79.387054 };
	
	// Create the initial InfoWindow (popup bubble with text)
	const infoWindow = new google.maps.InfoWindow({
		content: "Click anywhere to locate",
		position: initPosition,
	});
	
	// getTimezoneOffset() returns value in minutes by default, this is the time zone offset for the client side. Note the minus sign, because if offset equals -60 then the time zone offset is UTC+01
	// initTimestampOffset is in miliseconds
	const initTimestampOffset = Math.floor(-(new Date().getTimezoneOffset())*60000);
	
	// A request quota for Google's API is set (in Google Cloud console) to prevent unexpected cost
	console.log('Please contact the developer if an API key is needed for demo or if request quota of any API has been exceeded');
	
	// The map, centered at initPosition
	map = new google.maps.Map(document.getElementById("map"), {
		zoom: 15,
		center: initPosition,
	});
	
	// Open the InfoWindow, this can cause marker to disappear until InfoWindow is closed
	infoWindow.open(map);
	
	// The initial marker, positioned at initPosition
	marker = new google.maps.Marker({
		position: initPosition,
		map: map,
	});
	
	// Configure the click listener to react to user's mouse click
	map.addListener("click", (mapsMouseEvent) => {
		// Close the current InfoWindow, so that the marker can re-appear
		infoWindow.close();
		
		//clicking on the map causes the location to update
		locationChanged(
		mapsMouseEvent.latLng.lat(),
		mapsMouseEvent.latLng.lng()
		);
	});

	function initTextSearch() {
		let input = document.getElementById('searchTextField');
		let autocomplete = new google.maps.places.Autocomplete(input);
		//Sets a listener for when user clicks on a location from Autocomplete's pull-down suggestions
		google.maps.event.addListener(autocomplete, 'place_changed', function () {
			let place = autocomplete.getPlace();
			let userLat = place.geometry.location.lat();
			let userLng = place.geometry.location.lng();
			locationChanged (userLat, userLng);
		});
	}
	google.maps.event.addDomListener(window, 'load', initTextSearch);
	
	clockInfo='Client time (Input a location to view its local time instead): ';
	setClock(initTimestampOffset);
}

function locationChanged (userLat, userLng){
	// Construct an object with latitude and longitude, so that it can be passed to the Google Maps API
	let userLatLng = new google.maps.LatLng(userLat, userLng);
	
	// getTime() always uses UTC for time representation.
	let currentTimestamp = new Date().getTime();
	let currentTimestampInSec = Math.floor(currentTimestamp / 1000);
	let totalTimestampOffset;
	
	// for storing JSON data from Google Maps Time Zone API
	let timeZoneJson;
	
	// Set marker position and center position for the map
	marker.setPosition(userLatLng);
	map.panTo(userLatLng);
	
	document.getElementById("moreInfo").style.display = "none";
	
	// 6 decimal places for latitude and longitude offer distance precision between 0.0435m and 0.111m, precise enough to unambiguously recognize individual humans.
	latlngDisplay.innerHTML = 'Latitude: ' + userLat.toFixed(6) + '<br>Longitude: ' + userLng.toFixed(6);
	
	// Use jQuery to send GET request and retrive JSON to store in 'timeZoneJson' variable
	// The API key should be included here (immediately after "key=") with usage quota (set in Google Cloud console) to prevent unexpected cost
	$.getJSON('https://maps.googleapis.com/maps/api/timezone/json?location='+userLat+ ','+ userLng+'&timestamp='+currentTimestampInSec+'&key=', function(timeZoneJson) {
		// timeZoneJson format is already an JavaScript object, so JSON.parse() is not needed
		
		totalTimestampOffset = (timeZoneJson.dstOffset + timeZoneJson.rawOffset)*1000;
		
		// Reset the clock
		clearTimeout(clockIsOn);
		clockInfo = 'Local time (at this location): ';
		setClock(totalTimestampOffset);
		
		//Output time zone info such as "America/Toronto" and "Eastern Daylight Time"
		timeZoneInfo.innerHTML = "Time Zone Value: " + timeZoneJson.timeZoneId + 
		"<br>Time Zone Name: " + timeZoneJson.timeZoneName;
	
	});
}

function getLocation() {
	// if browser support geolocation
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(showPosition);
	}
	// otherwise report error
	else {
		alert('Geolocation is not supported by this browser.');
	}
}

function showPosition(position) {
	// Get individual values from position for latitude and longitude so that they can be passed into locationChanged
	let userLat = position.coords.latitude;
	let userLng = position.coords.longitude;
	
	locationChanged (userLat, userLng);
	
}

function setClock(timestampOffset){
	// current UTC timestamp in milliseconds
	let currentTimestamp = new Date().getTime();
	// current local timestamp of the chosen location
	let localTimestamp = Math.floor(currentTimestamp + timestampOffset);
	
	// Use only the UTC time (no other time zone should be used) of localDate to represent the local time of the chosen location
	let localDate = new Date(localTimestamp);
	
	// localDate.toLocaleString("en-GB", { timeZone: 'UTC' })); can also be used alternatively to display UTC time of localDate, especially when date and year need to be shown
	
	// The getUTCHours(), getUTCMinutes(), getUTCSeconds() only return UTC time, regardless of time zone of client
	let hr = localDate.getUTCHours();
	let min = localDate.getUTCMinutes();
	let sec = localDate.getUTCSeconds();
	hr = checkTime(hr);
	min = checkTime(min);
	sec = checkTime(sec);
	
	document.getElementById('UtcTimestamp').innerHTML = "UTC timestamp (in seconds): " + Math.floor(currentTimestamp / 1000);
	document.getElementById('liveClock').innerHTML =  clockInfo + hr + ":" + min + ":" + sec;
	
	// Repeat function every 1 second to recheck time
	clockIsOn = setTimeout(function () {
	setClock(timestampOffset);
	}, 1000);
}

function checkTime(i) {
	// To keep formatting consistent, add zero in front of numbers < 10
	if (i < 10) {
		i = "0" + i;
		};  
		return i;
}
