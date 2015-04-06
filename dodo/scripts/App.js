import React from 'react'
const isTouch = 'ontouchstart' in window || 'onmsgesturechange' in window;

class App extends React.Component {
    static propTypes = { id: React.PropTypes.string }
    constructor(props) { super(props)
        this.state = { pick: null, progress: [] }
    }
    post() {
        if (!this.state.pick) return;
        const {id} = this.props
        this.setState({ pick: '', progress: this.state.progress.concat([[id, this.state.pick]]) })
        this.props.onPick(this.state.pick);
    }
    render() {
        const {id, chars} = this.props
        const {pick} = this.state
        const candidates = []
        for (var x of chars) { candidates.push(x); }
        return (
            <div id="outer" onClick={()=>this.setState({})}>
            <div id="container">
                <img className="pane shadow-z-0" 
                src={"https://g0v.github.io/koktai/img/k/"+id+".png"}/>
                <span className="equals pane shadow-z-0">=</span>
                    <input className="pane answer" placeholder="?" ref={ (it) => {
                        if (it && !isTouch) { React.findDOMNode(it).focus() }
                    }} value='' onChange={(e) =>
                        (/^[1-5]$/.test(e.target.value)) ?
                            this.setState({ pick: candidates[e.target.value-1] })
                        : (e.target.value === '6' || e.target.value === 'x' || e.target.value === '0') ?
                            this.setState({ pick: 'Ⓧ' })
                        : (e.target.value === ' ') ?
                            this.post()
                        : ''
                    } style={{ left: pick ? '-1000px' : '' }}/>
                { pick ?
                <span className="final choice han shadow-z-2" onClick={()=>this.post()}>
                    { pick }</span>
                : <br/>}
            <div className="progress">
                <div className={"progress-bar " + (pick ? "progress-bar-success" : '')} style={{
                    width: this.state.progress.length + (pick ? 1 : 0) + "%", height: "100%"
                }}></div>
            </div>
                {[1,2,3,4,5].map(idx =>
                    <span className={"choice han shadow-z-" + (pick ? 0 : 3)} onClick={
                        ()=>this.setState({pick: candidates[idx-1]})
                    }>
                    { isTouch ? '' : <i className={"hint mdi-image-filter-" + idx} /> }{
                        candidates[idx-1]
                    }
                    </span>
                )}
                <span className={"choice shadow-z-" + (pick ? 0 : 3)} onClick={
                    ()=>this.setState({pick: 'Ⓧ'})
                }>
                    { isTouch ? '' : <i className="hint mdi-image-filter-6" /> }
                    <i className="hint mdi-image-filter-6" />Ⓧ
                </span>
            </div>
            </div>
        )
    }
}

export default App;
/*
const LogURL = 'https://ethercalc.org/log/'
export default Transmit.createContainer(App, {
    queries: {
        revs({id}) {
            if (!id) return new Promise((cb)=>cb([]))
            return request.get(LogURL + id).then((res) => res.body).catch(()=>[])
        }
    }
})

*/
