
// CRITICAL: Memory leak
class LeakyComponent extends Component {
    componentDidMount() {
        this.timer = setInterval(() => this.update(), 1000);
        window.addEventListener('scroll', this.onScroll);
    }
    // Missing componentWillUnmount!
}
