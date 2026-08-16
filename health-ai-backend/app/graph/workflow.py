"""Construction of the fixed evaluator → critic → optimizer LangGraph."""

from langgraph.graph import END, START, StateGraph

from app.graph.critic import critique_recommendations
from app.graph.evaluator import evaluate_questionnaire
from app.graph.optimizer import optimize_recommendations
from app.graph.state import RecommendationState


def build_recommendation_graph():
    """Compile and return the fixed clinical recommendation workflow."""

    graph = StateGraph(RecommendationState)
    graph.add_node("evaluator", evaluate_questionnaire)
    graph.add_node("critic", critique_recommendations)
    graph.add_node("optimizer", optimize_recommendations)
    graph.add_edge(START, "evaluator")
    graph.add_edge("evaluator", "critic")
    graph.add_edge("critic", "optimizer")
    graph.add_edge("optimizer", END)
    return graph.compile()
