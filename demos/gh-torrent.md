# GH-Torrent

SELECT * FROM projects LIMIT 10;
<lively-script>
let apiURL = 'https://172.16.64.132:5555/sql/';
let query = encodeURIComponent('SELECT * FROM projects LIMIT 10;');
fetch(`${apiURL}${query}`).then(p=>p.text());
</lively-script>
