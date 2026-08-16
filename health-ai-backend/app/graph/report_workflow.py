"""Construction of the fixed extractor → interpreter → verifier report workflow."""

from langgraph.graph import END, START, StateGraph

from app.graph.report_extractor import extract_report_parameters
from app.graph.report_interpreter import interpret_report
from app.graph.report_state import ReportAnalysisState
from app.graph.report_verifier import verify_report_analysis


def build_report_analysis_graph():
    """Compile the fixed, sequential report-analysis LangGraph."""

    graph = StateGraph(ReportAnalysisState)
    graph.add_node("extractor", extract_report_parameters)
    graph.add_node("interpreter", interpret_report)
    graph.add_node("verifier", verify_report_analysis)
    graph.add_edge(START, "extractor")
    graph.add_edge("extractor", "interpreter")
    graph.add_edge("interpreter", "verifier")
    graph.add_edge("verifier", END)
    return graph.compile()
