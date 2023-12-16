![state-of-being repo cover](https://github.com/krimlabs/state-of-being/assets/1925158/1fc589a5-e822-4e59-883b-ed3b3d5aff96)

# Introduction
`state of being` is a collection of scripts and tasks that collects and quantifies my current state and goals.

At an atomic level, it tracks my sleep, awareness, workouts and meditation efficiency. At an abstract level, it ties my daily tasks ([कर्म](https://www.rekhtadictionary.com/meaning-of-karm#:~:text=act%2C%20deed%2C%20religious%20act%2C%20destiny)) to my vision for life. 
With this project, I intend to track and improve myself like I would track a product. 

The principles of this system are a product of my teacher and mentor [Dr. Amit Jain](https://www.linkedin.com/in/dramitjain/?originalSubdomain=in). The data collection and interfaces are inspired by the works of [@AnandChoudhary](https://github.com/AnandChowdhary/life) and [Bryan Johnson](https://protocol.bryanjohnson.com/). 

## API
I use jsDeliver's free code CDN to serve the files in this repo as an API.
The base url is: `https://cdn.jsdelivr.net/gh/krimlabs/state-of-being@master`

|Endpoint| Description |
|--|--| 
|[/vault/workouts.json](https://cdn.jsdelivr.net/gh/krimlabs/state-of-being@master/vault/workouts.json) | Get workout stats by year and month, and yearly aggregates|
|[/vault/meditations.json](https://cdn.jsdelivr.net/gh/krimlabs/state-of-being@master/vault/meditations.json) | Get meditation stats by year and month. Includes data on awareness, life problems that I'm currently tackling and the efforts I'm spending on each problem.|
|[/vault/ultrahuman/index.json](https://cdn.jsdelivr.net/gh/krimlabs/state-of-being@master/vault/ultrahuman/index.json) | List of weeks for which sleep data is available |
|[/vault/ultrahuman/13-03-2023.json](https://cdn.jsdelivr.net/gh/krimlabs/state-of-being@master/vault/ultrahuman/13-02-2023.json) | Weekly sleep data for week starting at `13-03-2023`. List of start dates come from index. |
|[/vault/ultrahuman/sleep.json](https://cdn.jsdelivr.net/gh/krimlabs/state-of-being@master/vault/ultrahuman/sleep.json) | Aggregate sleep and recovery data by year and month |

## Dashboard
A public dashboard is in under construction and will be available at [krimlabs.com/state-of-being](https://krimlabs.com/state-of-being)
